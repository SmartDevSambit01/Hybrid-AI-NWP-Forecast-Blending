"""
CRPS (Continuous Ranked Probability Score) Module.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 5.

Implements Gaussian closed-form CRPS:
  CRPS(N(mu, sigma), y) = sigma * { (y - mu)/sigma * [2*Phi((y - mu)/sigma) - 1]
                                     + 2*phi((y - mu)/sigma)
                                     - 1/sqrt(pi) }
where phi = standard normal PDF, Phi = standard normal CDF.

Reference: Gneiting & Raftery (2007), JASA 102(477):359-378.
"""

import math
from typing import List, Optional
from pydantic import BaseModel

from backend.calibration.bias_correction import VerificationRecord


# --- Standard Normal helpers ---
def _phi(z: float) -> float:
    """Standard normal PDF: phi(z) = exp(-z^2/2) / sqrt(2*pi)"""
    return math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)


def _Phi(z: float) -> float:
    """Standard normal CDF using math.erfc for numerical stability."""
    return 0.5 * math.erfc(-z / math.sqrt(2.0))


# --- Data Models ---
class CRPSResult(BaseModel):
    model_id: str
    model_name: str
    crps_mean: float
    crps_sample_count: int
    mu_mean: float          # mean predictive mean over records
    sigma_used: float       # sigma used for distribution
    data_status: str = "demo_replay"
    note: str = ""


class CRPSSummary(BaseModel):
    location_id: str
    variable_id: str
    lead_hours: int
    results: List[CRPSResult]
    data_status: str = "demo_replay"


# --- Core CRPS Computation ---
def crps_gaussian_single(mu: float, sigma: float, y: float) -> float:
    """
    Closed-form Gaussian CRPS for a single observation y given N(mu, sigma).

    CRPS(N(mu, sigma), y) = sigma * { z*(2*Phi(z) - 1) + 2*phi(z) - 1/sqrt(pi) }
    where z = (y - mu) / sigma.

    Returns 0.0 (perfect score) if sigma <= 0.
    """
    if sigma <= 0.0:
        return abs(y - mu)  # deterministic fallback: MAE

    z = (y - mu) / sigma
    term1 = z * (2.0 * _Phi(z) - 1.0)
    term2 = 2.0 * _phi(z)
    term3 = 1.0 / math.sqrt(math.pi)

    crps_val = sigma * (term1 + term2 - term3)
    return max(0.0, round(crps_val, 6))


def compute_crps_for_model(
    model_id: str,
    model_name: str,
    records: List[VerificationRecord],
    predictive_sigma: float,
) -> CRPSResult:
    """
    Computes mean CRPS over a list of verification replay records
    for a given model using its historical error sigma as the predictive sigma.

    The forecast value in each record is used as the predictive mean mu.
    """
    if not records:
        return CRPSResult(
            model_id=model_id,
            model_name=model_name,
            crps_mean=0.0,
            crps_sample_count=0,
            mu_mean=0.0,
            sigma_used=predictive_sigma,
            note="no_records_available",
        )

    sigma = max(0.01, predictive_sigma)
    crps_vals = [crps_gaussian_single(r.forecast, sigma, r.observed) for r in records]
    crps_mean = round(sum(crps_vals) / len(crps_vals), 4)
    mu_mean = round(sum(r.forecast for r in records) / len(records), 3)

    note = ""
    if len(records) < 5:
        note = f"small_sample_n{len(records)}_interpret_with_caution"

    return CRPSResult(
        model_id=model_id,
        model_name=model_name,
        crps_mean=crps_mean,
        crps_sample_count=len(records),
        mu_mean=mu_mean,
        sigma_used=round(sigma, 3),
        note=note,
    )
