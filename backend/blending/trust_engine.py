"""
Dynamic Model Trust and Recent Skill Engine.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 3.

Implements:
1. Continuous Verification Metrics: MAE, RMSE, Bias.
2. Exponentially Weighted Recent Error: E_t = lambda * E_{t-1} + (1 - lambda) * L_t (lambda = 0.8).
3. Dynamic Trust Score: trust_i = 1 / (epsilon + error_i) (epsilon = 0.001).
4. Adaptive Trust-Normalized Weights: w_i = trust_i / sum(trust_j) for active models.
5. Adaptive Blend: F_blend = sum(w_i * F_i,calibrated).
"""

import math
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

from backend.calibration.bias_correction import (
    VerificationRecord,
    load_verification_records,
    get_context_calibration,
    CalibrationResult,
)


class ModelSkillMetrics(BaseModel):
    model_id: str
    mae: float
    rmse: float
    bias: float
    exp_weighted_mae: float
    sample_count: int
    data_status: str = "demo_replay"


class ModelTrustWeight(BaseModel):
    model_id: str
    model_name: str
    raw_forecast: float
    calibrated_forecast: float
    bias: float
    mae: float
    sample_count: int
    trust_score: float
    adaptive_weight: float
    equal_weight: float
    is_active: bool
    status_label: str = Field(description="'active', 'user_disabled', or 'no_data'")


class AdaptiveBlendResult(BaseModel):
    strategy: str = Field(description="'adaptive_skill' or 'equal_baseline'")
    location_id: str
    variable_id: str
    lead_hours: int
    unit: str
    active_count: int
    total_models: int
    calibrated_blended_value: Optional[float]
    raw_blended_value: Optional[float]
    equal_baseline_value: Optional[float]
    models: List[ModelTrustWeight]
    status: str = Field(description="'ready' or 'no_active_models'")
    explanation: str
    data_status: str = "demo_replay"


def calculate_model_skill(
    records: List[VerificationRecord],
    recent_window: int = 10,
    decay_lambda: float = 0.8
) -> ModelSkillMetrics:
    """
    Computes continuous verification metrics and exponentially weighted error.
    """
    if not records:
        return ModelSkillMetrics(
            model_id="unknown",
            mae=0.0,
            rmse=0.0,
            bias=0.0,
            exp_weighted_mae=0.0,
            sample_count=0,
        )

    # Use windowed recent records
    windowed = records[:recent_window]
    n = len(windowed)
    model_id = windowed[0].modelId

    errors = [r.forecast - r.observed for r in windowed]
    abs_errors = [abs(e) for e in errors]
    sq_errors = [e ** 2 for e in errors]

    mae = round(sum(abs_errors) / n, 3)
    rmse = round(math.sqrt(sum(sq_errors) / n), 3)
    bias = round(sum(errors) / n, 3)

    # Exponentially weighted error E_t = lambda * E_{t-1} + (1 - lambda) * L_t
    # Initialized at first error, updated through sequence
    ew_error = abs_errors[0]
    for err in abs_errors[1:]:
        ew_error = decay_lambda * ew_error + (1.0 - decay_lambda) * err
    ew_mae = round(ew_error, 3)

    return ModelSkillMetrics(
        model_id=model_id,
        mae=mae,
        rmse=rmse,
        bias=bias,
        exp_weighted_mae=ew_mae,
        sample_count=n,
    )


def compute_dynamic_trust_blend(
    raw_forecasts: Dict[str, float],
    location_id: str,
    variable_id: str,
    lead_hours: int,
    unit: str = "mm",
    model_switches: Optional[Dict[str, bool]] = None,
    strategy: str = "adaptive_skill",
    epsilon: float = 0.001,
    all_records: Optional[List[VerificationRecord]] = None
) -> AdaptiveBlendResult:
    """
    Computes calibrated forecasts, dynamic trust scores, normalized weights,
    and the final blended forecast.
    """
    switches = model_switches or {m: True for m in raw_forecasts.keys()}
    records = all_records if all_records is not None else load_verification_records()

    model_names_map = {
        "ncmrwf_ncum": "NCMRWF NCUM (Global NWP)",
        "ncmrwf_neps": "NCMRWF NEPS (Ensemble NWP)",
        "ai_graphcast": "AI Weather Model (Deep Learning)",
    }

    # Step 1: Compute calibration and skill for each model
    model_details: List[ModelTrustWeight] = []
    active_trusts: Dict[str, float] = {}

    for model_id, raw_val in raw_forecasts.items():
        is_active = switches.get(model_id, True)

        # 1. Calibration
        calib = get_context_calibration(
            raw_forecast=raw_val,
            model_id=model_id,
            location_id=location_id,
            variable_id=variable_id,
            lead_hours=lead_hours,
            unit=unit,
            records=records,
        )

        # 2. Skill Metrics (filter records for model/context)
        context_records = [
            r for r in records
            if r.modelId == model_id
            and (r.locationId.upper() == location_id.upper() or r.variableId.lower() == variable_id.lower())
            and r.leadHours == lead_hours
        ]
        skill = calculate_model_skill(context_records)

        # 3. Dynamic Trust Score = 1 / (epsilon + MAE)
        trust_score = round(1.0 / (epsilon + max(0.0, skill.mae)), 4) if is_active else 0.0

        if is_active:
            active_trusts[model_id] = trust_score

        model_details.append(
            ModelTrustWeight(
                model_id=model_id,
                model_name=model_names_map.get(model_id, model_id.upper()),
                raw_forecast=raw_val,
                calibrated_forecast=calib.calibrated_forecast,
                bias=calib.bias,
                mae=skill.mae,
                sample_count=skill.sample_count,
                trust_score=trust_score,
                adaptive_weight=0.0,
                equal_weight=0.0,
                is_active=is_active,
                status_label="active" if is_active else "user_disabled",
            )
        )

    active_count = len(active_trusts)
    total_models = len(raw_forecasts)

    # Step 2: Weight Normalization
    total_trust = sum(active_trusts.values())

    for md in model_details:
        if md.is_active and active_count > 0:
            md.equal_weight = round(1.0 / active_count, 4)
            if total_trust > 0:
                md.adaptive_weight = round(active_trusts[md.model_id] / total_trust, 4)
            else:
                md.adaptive_weight = md.equal_weight
        else:
            md.equal_weight = 0.0
            md.adaptive_weight = 0.0

    # Ensure weights sum exactly to 1.0 for active models (numerical adjustment)
    if active_count > 0:
        active_weights = [md.adaptive_weight for md in model_details if md.is_active]
        diff = 1.0 - sum(active_weights)
        if abs(diff) > 1e-6:
            # Adjust first active model by small rounding delta
            for md in model_details:
                if md.is_active:
                    md.adaptive_weight = round(md.adaptive_weight + diff, 4)
                    break

    # Step 3: Handle Zero Active Models
    if active_count == 0:
        return AdaptiveBlendResult(
            strategy=strategy,
            location_id=location_id,
            variable_id=variable_id,
            lead_hours=lead_hours,
            unit=unit,
            active_count=0,
            total_models=total_models,
            calibrated_blended_value=None,
            raw_blended_value=None,
            equal_baseline_value=None,
            models=model_details,
            status="no_active_models",
            explanation="All forecast models are currently disabled. Enable at least one model to calculate trust weights and blend.",
        )

    # Step 4: Compute Blended Values
    active_models = [md for md in model_details if md.is_active]

    # Equal Baseline
    equal_val = round(sum(md.calibrated_forecast * md.equal_weight for md in active_models), 2)
    raw_val = round(sum(md.raw_forecast * (1.0 / active_count) for md in active_models), 2)

    # Adaptive Skill Blend
    if strategy == "adaptive_skill":
        calib_blend = round(sum(md.calibrated_forecast * md.adaptive_weight for md in active_models), 2)
    else:
        calib_blend = equal_val

    # Step 5: Generate Explainability Sentence
    best_model = min(active_models, key=lambda m: m.mae)
    worst_model = max(active_models, key=lambda m: m.mae)

    if best_model.mae < worst_model.mae:
        explanation = (
            f"{best_model.model_name.split()[0]} receives the highest trust weight "
            f"({(best_model.adaptive_weight * 100):.1f}%) because its recent replay MAE is lowest "
            f"({best_model.mae:.2f} {unit} vs {worst_model.mae:.2f} {unit} for {worst_model.model_name.split()[0]}) "
            f"in this {location_id} {variable_id} context."
        )
    else:
        explanation = "Active models have comparable recent replay error; trust weights remain uniformly distributed."

    return AdaptiveBlendResult(
        strategy=strategy,
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        unit=unit,
        active_count=active_count,
        total_models=total_models,
        calibrated_blended_value=calib_blend,
        raw_blended_value=raw_val,
        equal_baseline_value=equal_val,
        models=model_details,
        status="ready",
        explanation=explanation,
    )
