"""
Online Rolling Skill Monitor Module.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 5.

Implements exponential rolling updates for MAE, RMSE, Bias, and CRPS:
  E_t = lambda * E_{t-1} + (1 - lambda) * L_t   (lambda = 0.8)

Also generates trust-change explanations by comparing
exponential-skill-weighted trust to equal-weight trust.
"""

import math
from typing import List, Optional
from pydantic import BaseModel

from backend.calibration.bias_correction import VerificationRecord
from backend.probabilistic.crps import crps_gaussian_single

DECAY_LAMBDA = 0.8
EPSILON = 0.001   # trust score denominator guard

_MODEL_NAMES = {
    "ncmrwf_ncum": "NCMRWF NCUM",
    "ncmrwf_neps": "NCMRWF NEPS",
    "ai_graphcast": "AI Weather Model",
}


# --- Data Models ---
class RollingMetric(BaseModel):
    step_index: int         # 1-indexed position in the record series
    forecast: float
    observed: float
    absolute_error: float
    squared_error: float
    crps_value: float
    rolling_mae: float
    rolling_rmse: float
    rolling_bias: float
    rolling_crps: float
    data_status: str = "demo_replay"


class RollingSkillResult(BaseModel):
    model_id: str
    model_name: str
    location_id: str
    variable_id: str
    lead_hours: int
    lambda_decay: float = DECAY_LAMBDA
    final_rolling_mae: float
    final_rolling_rmse: float
    final_rolling_bias: float
    final_rolling_crps: float
    trust_score: float           # 1 / (epsilon + rolling_mae)
    sample_count: int
    series: List[RollingMetric]
    data_status: str = "demo_replay"
    note: str = ""


class TrustChangeExplanation(BaseModel):
    model_id: str
    model_name: str
    previous_mae: float          # simple (equal-weight) MAE
    rolling_mae: float           # exponential rolling MAE
    mae_delta: float             # rolling_mae - previous_mae (positive = degraded)
    trust_score: float
    adaptive_weight: float
    equal_weight: float
    weight_delta: float          # adaptive - equal
    explanation: str
    data_status: str = "demo_replay"


class RollingSkillSummary(BaseModel):
    location_id: str
    variable_id: str
    lead_hours: int
    lambda_decay: float = DECAY_LAMBDA
    models: List[RollingSkillResult]
    trust_explanations: List[TrustChangeExplanation]
    data_status: str = "demo_replay"


# --- Rolling computation ---
def compute_rolling_skill(
    model_id: str,
    records: List[VerificationRecord],
    predictive_sigma: float,
    location_id: str = "",
    variable_id: str = "",
    lead_hours: int = 24,
    decay_lambda: float = DECAY_LAMBDA,
) -> RollingSkillResult:
    """
    Compute exponential rolling MAE, RMSE, Bias, and CRPS over ordered records.

    Records are assumed to be ordered oldest-first (or the order they appear).
    Formula: E_t = lambda * E_{t-1} + (1 - lambda) * L_t
    """
    model_name = _MODEL_NAMES.get(model_id, model_id)
    sigma = max(0.01, predictive_sigma)

    if not records:
        return RollingSkillResult(
            model_id=model_id,
            model_name=model_name,
            location_id=location_id,
            variable_id=variable_id,
            lead_hours=lead_hours,
            final_rolling_mae=0.0,
            final_rolling_rmse=0.0,
            final_rolling_bias=0.0,
            final_rolling_crps=0.0,
            trust_score=round(1.0 / EPSILON, 4),
            sample_count=0,
            series=[],
            note="no_records",
        )

    series: List[RollingMetric] = []
    roll_mae = 0.0
    roll_rmse = 0.0
    roll_bias = 0.0
    roll_crps = 0.0

    for i, r in enumerate(records):
        err = r.forecast - r.observed
        abs_err = abs(err)
        sq_err = err * err
        crps_val = crps_gaussian_single(r.forecast, sigma, r.observed)

        if i == 0:
            roll_mae = abs_err
            roll_rmse = math.sqrt(sq_err)
            roll_bias = err
            roll_crps = crps_val
        else:
            roll_mae = decay_lambda * roll_mae + (1.0 - decay_lambda) * abs_err
            roll_rmse = decay_lambda * roll_rmse + (1.0 - decay_lambda) * math.sqrt(sq_err)
            roll_bias = decay_lambda * roll_bias + (1.0 - decay_lambda) * err
            roll_crps = decay_lambda * roll_crps + (1.0 - decay_lambda) * crps_val

        series.append(
            RollingMetric(
                step_index=i + 1,
                forecast=round(r.forecast, 3),
                observed=round(r.observed, 3),
                absolute_error=round(abs_err, 4),
                squared_error=round(sq_err, 4),
                crps_value=round(crps_val, 6),
                rolling_mae=round(roll_mae, 4),
                rolling_rmse=round(roll_rmse, 4),
                rolling_bias=round(roll_bias, 4),
                rolling_crps=round(roll_crps, 6),
            )
        )

    trust = round(1.0 / (EPSILON + max(0.0, roll_mae)), 4)

    note = ""
    if len(records) < 5:
        note = f"small_sample_n{len(records)}_rolling_metrics_stabilize_with_more_data"

    return RollingSkillResult(
        model_id=model_id,
        model_name=model_name,
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        final_rolling_mae=round(roll_mae, 4),
        final_rolling_rmse=round(roll_rmse, 4),
        final_rolling_bias=round(roll_bias, 4),
        final_rolling_crps=round(roll_crps, 6),
        trust_score=trust,
        sample_count=len(records),
        series=series,
    )


def compute_trust_explanations(
    rolling_results: List[RollingSkillResult],
    unit: str = "mm",
) -> List[TrustChangeExplanation]:
    """
    Generates per-model trust change explanations comparing
    rolling-skill-derived adaptive weights to equal-weight baseline.
    """
    active = [r for r in rolling_results if r.sample_count > 0]
    n_active = len(active)

    if n_active == 0:
        return []

    # Compute trust scores
    trusts = [r.trust_score for r in active]
    total_trust = sum(trusts)

    explanations: List[TrustChangeExplanation] = []
    eq_weight = round(1.0 / n_active, 4) if n_active > 0 else 0.0

    # Compute simple MAE as equal-weight reference
    for r in active:
        # Simple MAE (equal-weight, non-rolling)
        if r.series:
            simple_mae = round(
                sum(s.absolute_error for s in r.series) / len(r.series), 4
            )
        else:
            simple_mae = 0.0

        adaptive_w = round(r.trust_score / total_trust, 4) if total_trust > 0 else eq_weight
        mae_delta = round(r.final_rolling_mae - simple_mae, 4)

        # Generate explanation text
        if abs(mae_delta) < 0.001:
            direction = "stable"
            msg = (
                f"{r.model_name}: Rolling MAE ({r.final_rolling_mae:.3f} {unit}) "
                f"is consistent with simple average MAE ({simple_mae:.3f} {unit}). "
                f"Adaptive weight ({adaptive_w*100:.1f}%) vs equal weight ({eq_weight*100:.1f}%) "
                f"reflects relative skill parity."
            )
        elif mae_delta > 0:
            direction = "degraded"
            msg = (
                f"{r.model_name}: Recent rolling MAE ({r.final_rolling_mae:.3f} {unit}) "
                f"is higher than simple average ({simple_mae:.3f} {unit}), indicating recent "
                f"skill degradation. Weight reduced to {adaptive_w*100:.1f}% vs equal {eq_weight*100:.1f}%."
            )
        else:
            direction = "improved"
            msg = (
                f"{r.model_name}: Recent rolling MAE ({r.final_rolling_mae:.3f} {unit}) "
                f"is lower than simple average ({simple_mae:.3f} {unit}), indicating recent "
                f"skill improvement. Weight increased to {adaptive_w*100:.1f}% vs equal {eq_weight*100:.1f}%."
            )

        explanations.append(
            TrustChangeExplanation(
                model_id=r.model_id,
                model_name=r.model_name,
                previous_mae=simple_mae,
                rolling_mae=r.final_rolling_mae,
                mae_delta=mae_delta,
                trust_score=r.trust_score,
                adaptive_weight=adaptive_w,
                equal_weight=eq_weight,
                weight_delta=round(adaptive_w - eq_weight, 4),
                explanation=msg,
            )
        )

    return explanations


def compute_rolling_skill_summary(
    records: List[VerificationRecord],
    predictive_sigmas: dict,   # {model_id: sigma}
    location_id: str,
    variable_id: str,
    lead_hours: int,
    unit: str = "mm",
) -> RollingSkillSummary:
    """
    Orchestrates rolling skill computation for all models
    and generates trust explanations.
    """
    model_ids = ["ncmrwf_ncum", "ncmrwf_neps", "ai_graphcast"]
    rolling_results: List[RollingSkillResult] = []

    for mid in model_ids:
        m_records = [r for r in records if r.modelId == mid]
        sigma = predictive_sigmas.get(mid, 1.0)
        result = compute_rolling_skill(
            model_id=mid,
            records=m_records,
            predictive_sigma=sigma,
            location_id=location_id,
            variable_id=variable_id,
            lead_hours=lead_hours,
        )
        rolling_results.append(result)

    explanations = compute_trust_explanations(rolling_results, unit=unit)

    return RollingSkillSummary(
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        models=rolling_results,
        trust_explanations=explanations,
    )
