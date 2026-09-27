"""
Threshold Exceedance Probability Engine.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 4.

Implements:
P(Y > T) = 1 - Phi((T - mu) / sigma) = 0.5 * (1 - erf((T - mu) / (sigma * sqrt(2))))
"""

import math
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ThresholdExceedanceResult(BaseModel):
    threshold: float
    unit: str
    variable_id: str
    probability: float = Field(ge=0.0, le=1.0)
    probability_percent: float
    classification: str = Field(description="'Low', 'Moderate', 'High', or 'Very High'")
    predictive_mean: float
    predictive_sigma: float
    data_status: str = "demo_replay"


def calculate_exceedance_probability(
    mean: float,
    sigma: float,
    threshold: float
) -> float:
    """
    Computes P(Y > threshold) under Gaussian distribution Y ~ N(mean, sigma).
    Mathematically safe against sigma <= 0 and floating-point extremes.
    """
    if sigma <= 0.0001:
        if mean > threshold:
            return 1.0
        elif mean < threshold:
            return 0.0
        else:
            return 0.5

    # z = (T - mu) / (sigma * sqrt(2))
    z = (threshold - mean) / (sigma * math.sqrt(2.0))

    # P(Y <= T) = 0.5 * (1 + erf(z))
    # P(Y > T) = 1 - P(Y <= T) = 0.5 * (1 - erf(z))
    prob = 0.5 * (1.0 - math.erf(z))

    # Clamp safely between 0.0 and 1.0
    return round(max(0.0, min(1.0, prob)), 4)


def classify_probability_band(prob: float) -> str:
    """
    Categorizes exceedance probability into prototype warning bands.
    < 20%: Low
    20 - 50%: Moderate
    50 - 80%: High
    > 80%: Very High
    """
    if prob < 0.20:
        return "Low"
    elif prob <= 0.50:
        return "Moderate"
    elif prob <= 0.80:
        return "High"
    return "Very High"


def get_variable_threshold_presets(variable_id: str) -> List[float]:
    """
    Returns prototype preset threshold levels per meteorological variable.
    """
    var = variable_id.lower()
    if var in ["rainfall", "precip_surface"]:
        return [10.0, 25.0, 50.0, 100.0]
    elif var in ["temperature", "temperature_2m"]:
        return [35.0, 40.0]
    elif var in ["wind_speed", "wind_speed_10m"]:
        return [40.0, 60.0, 80.0]
    return [10.0, 25.0, 50.0]


def evaluate_threshold_exceedance(
    mean: float,
    sigma: float,
    threshold: float,
    variable_id: str,
    unit: str = "mm"
) -> ThresholdExceedanceResult:
    """
    Evaluates probability of exceeding specified threshold with classification.
    """
    prob = calculate_exceedance_probability(mean, sigma, threshold)
    classification = classify_probability_band(prob)

    return ThresholdExceedanceResult(
        threshold=threshold,
        unit=unit,
        variable_id=variable_id,
        probability=prob,
        probability_percent=round(prob * 100.0, 1),
        classification=classification,
        predictive_mean=mean,
        predictive_sigma=sigma,
    )
