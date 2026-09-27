"""
EMOS-Inspired Gaussian Predictive Distribution & Uncertainty Engine.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 4.

Implements:
1. Model-level Gaussian predictive distribution Y ~ N(mu, sigma).
2. Deterministic prediction intervals (50%, 80%, 90%).
3. Mixture variance probabilistic blend combining:
   - Within-model historical uncertainty: sum(w_i * sigma_i^2)
   - Between-model disagreement: sum(w_i * (mu_i - mu_blend)^2)
4. Model spread (standard deviation of active model means).
"""

import math
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel, Field

from backend.calibration.bias_correction import VerificationRecord, load_verification_records


# Z-scores for two-sided prediction intervals
Z_50 = 0.674
Z_80 = 1.282
Z_90 = 1.645

SIGMA_MIN_DEFAULT = 0.5


class PredictionInterval(BaseModel):
    lower: float
    upper: float


class ModelProbabilisticForecast(BaseModel):
    model_id: str
    model_name: str
    raw_forecast: float
    calibrated_mean: float
    historical_error_std: float
    predictive_sigma: float
    interval_50: PredictionInterval
    interval_80: PredictionInterval
    interval_90: PredictionInterval
    weight: float
    is_active: bool
    data_status: str = "demo_replay"


class BlendedProbabilisticForecast(BaseModel):
    location_id: str
    variable_id: str
    lead_hours: int
    unit: str
    strategy: str
    blended_mean: Optional[float]
    blended_sigma: Optional[float]
    within_model_variance: Optional[float]
    between_model_variance: Optional[float]
    within_model_sigma: Optional[float]
    between_model_sigma: Optional[float]
    model_spread: Optional[float]
    disagreement_level: str = Field(description="'Low', 'Moderate', or 'High' disagreement")
    interval_50: Optional[PredictionInterval]
    interval_80: Optional[PredictionInterval]
    interval_90: Optional[PredictionInterval]
    active_count: int
    models: List[ModelProbabilisticForecast]
    status: str
    data_status: str = "demo_replay"


def calculate_error_dispersion(
    records: List[VerificationRecord],
    sigma_min: float = SIGMA_MIN_DEFAULT
) -> float:
    """
    Computes standard deviation of forecast error from deterministic replay pairs.
    Enforces minimum sigma threshold (sigma_min) to avoid zero-uncertainty pathology.
    """
    if len(records) < 2:
        return sigma_min

    errors = [r.forecast - r.observed for r in records]
    mean_err = sum(errors) / len(errors)
    variance = sum((e - mean_err) ** 2 for e in errors) / (len(errors) - 1)
    std_dev = math.sqrt(variance)

    return round(max(sigma_min, std_dev), 3)


def calculate_intervals(
    mean: float,
    sigma: float,
    variable_id: str
) -> Tuple[PredictionInterval, PredictionInterval, PredictionInterval]:
    """
    Computes Gaussian prediction intervals (50%, 80%, 90%) with physical boundaries.
    """
    is_non_negative = variable_id.lower() in ["rainfall", "precip_surface", "wind_speed", "wind_speed_10m"]

    def bound(val: float) -> float:
        return max(0.0, val) if is_non_negative else val

    i50 = PredictionInterval(
        lower=round(bound(mean - Z_50 * sigma), 2),
        upper=round(mean + Z_50 * sigma, 2)
    )
    i80 = PredictionInterval(
        lower=round(bound(mean - Z_80 * sigma), 2),
        upper=round(mean + Z_80 * sigma, 2)
    )
    i90 = PredictionInterval(
        lower=round(bound(mean - Z_90 * sigma), 2),
        upper=round(mean + Z_90 * sigma, 2)
    )

    return i50, i80, i90


def compute_model_probabilistic_forecast(
    model_id: str,
    model_name: str,
    raw_forecast: float,
    calibrated_mean: float,
    variable_id: str,
    weight: float = 0.0,
    is_active: bool = True,
    records: Optional[List[VerificationRecord]] = None,
    sigma_min: float = SIGMA_MIN_DEFAULT
) -> ModelProbabilisticForecast:
    """
    Constructs Gaussian probabilistic distribution for a single model feed.
    """
    rec_list = records if records is not None else []
    err_std = calculate_error_dispersion(rec_list, sigma_min=sigma_min)

    i50, i80, i90 = calculate_intervals(calibrated_mean, err_std, variable_id)

    return ModelProbabilisticForecast(
        model_id=model_id,
        model_name=model_name,
        raw_forecast=raw_forecast,
        calibrated_mean=calibrated_mean,
        historical_error_std=err_std,
        predictive_sigma=err_std,
        interval_50=i50,
        interval_80=i80,
        interval_90=i90,
        weight=weight,
        is_active=is_active,
    )


def classify_model_disagreement(spread: float, variable_id: str) -> str:
    """
    Classifies model spread into prototype disagreement bands.
    """
    if variable_id.lower() in ["rainfall", "precip_surface"]:
        if spread < 1.0:
            return "Low Disagreement"
        elif spread <= 3.0:
            return "Moderate Disagreement"
        return "High Disagreement"
    elif variable_id.lower() in ["temperature", "temperature_2m"]:
        if spread < 0.5:
            return "Low Disagreement"
        elif spread <= 1.5:
            return "Moderate Disagreement"
        return "High Disagreement"
    else:  # wind speed
        if spread < 2.0:
            return "Low Disagreement"
        elif spread <= 5.0:
            return "Moderate Disagreement"
        return "High Disagreement"


def compute_probabilistic_blend(
    models: List[ModelProbabilisticForecast],
    location_id: str,
    variable_id: str,
    lead_hours: int,
    unit: str = "mm",
    strategy: str = "adaptive_skill"
) -> BlendedProbabilisticForecast:
    """
    Computes unified probabilistic blend and variance decomposition:
    mu_blend = sum(w_i * mu_i)
    var_blend = sum(w_i * sigma_i^2) + sum(w_i * (mu_i - mu_blend)^2)
    """
    active_models = [m for m in models if m.is_active]
    active_count = len(active_models)

    if active_count == 0:
        return BlendedProbabilisticForecast(
            location_id=location_id,
            variable_id=variable_id,
            lead_hours=lead_hours,
            unit=unit,
            strategy=strategy,
            blended_mean=None,
            blended_sigma=None,
            within_model_variance=None,
            between_model_variance=None,
            within_model_sigma=None,
            between_model_sigma=None,
            model_spread=None,
            disagreement_level="No Active Models",
            interval_50=None,
            interval_80=None,
            interval_90=None,
            active_count=0,
            models=models,
            status="no_active_models",
        )

    # 1. Blended Mean mu_blend = sum(w_i * mu_i)
    mu_blend = round(sum(m.weight * m.calibrated_mean for m in active_models), 2)

    # 2. Uncertainty Decomposition:
    # Within-model variance = sum(w_i * sigma_i^2)
    var_within = sum(m.weight * (m.predictive_sigma ** 2) for m in active_models)

    # Between-model variance = sum(w_i * (mu_i - mu_blend)^2)
    var_between = sum(m.weight * ((m.calibrated_mean - mu_blend) ** 2) for m in active_models)

    # Total mixture variance
    var_total = var_within + var_between
    sigma_blend = round(math.sqrt(max(0.0001, var_total)), 2)

    # Model spread = standard deviation of active model means
    if active_count > 1:
        mean_of_means = sum(m.calibrated_mean for m in active_models) / active_count
        spread_var = sum((m.calibrated_mean - mean_of_means) ** 2 for m in active_models) / (active_count - 1)
        model_spread = round(math.sqrt(spread_var), 2)
    else:
        model_spread = 0.0

    disagreement = classify_model_disagreement(model_spread, variable_id)

    # Intervals for blended distribution
    i50, i80, i90 = calculate_intervals(mu_blend, sigma_blend, variable_id)

    return BlendedProbabilisticForecast(
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        unit=unit,
        strategy=strategy,
        blended_mean=mu_blend,
        blended_sigma=sigma_blend,
        within_model_variance=round(var_within, 3),
        between_model_variance=round(var_between, 3),
        within_model_sigma=round(math.sqrt(var_within), 2),
        between_model_sigma=round(math.sqrt(var_between), 2),
        model_spread=model_spread,
        disagreement_level=disagreement,
        interval_50=i50,
        interval_80=i80,
        interval_90=i90,
        active_count=active_count,
        models=models,
        status="ready",
    )
