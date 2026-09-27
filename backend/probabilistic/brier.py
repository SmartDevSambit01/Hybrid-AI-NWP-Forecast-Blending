"""
Brier Score Threshold Verification Module.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 4.

Implements:
Brier = (1 / n) * sum( (p_k - event_k)^2 )
where event_k = 1 if observed_k > threshold else 0
"""

from typing import List, Optional
from pydantic import BaseModel, Field

from backend.calibration.bias_correction import VerificationRecord


class BrierScoreResult(BaseModel):
    threshold: float
    unit: str
    variable_id: str
    brier_score: float
    sample_count: int
    data_status: str = "demo_replay"


def calculate_brier_score(
    records: List[VerificationRecord],
    threshold: float,
    predictive_sigma: float,
    variable_id: str = "rainfall",
    unit: str = "mm"
) -> BrierScoreResult:
    """
    Computes Brier Score over verification records for a given threshold:
    Brier = mean((P(forecast > T) - (observed > T))^2)
    """
    if not records:
        return BrierScoreResult(
            threshold=threshold,
            unit=unit,
            variable_id=variable_id,
            brier_score=0.0,
            sample_count=0,
        )

    # Import exceedance calculator
    from backend.probabilistic.exceedance import calculate_exceedance_probability

    squared_errors: List[float] = []
    for r in records:
        prob = calculate_exceedance_probability(r.forecast, predictive_sigma, threshold)
        event = 1.0 if r.observed > threshold else 0.0
        squared_errors.append((prob - event) ** 2)

    brier = round(sum(squared_errors) / len(squared_errors), 4)

    return BrierScoreResult(
        threshold=threshold,
        unit=unit,
        variable_id=variable_id,
        brier_score=brier,
        sample_count=len(records),
    )
