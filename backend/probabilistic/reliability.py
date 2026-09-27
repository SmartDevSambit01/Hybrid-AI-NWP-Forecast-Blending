"""
Reliability Diagram & Coverage Diagnostic Module.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 5.

Implements:
1. Reliability diagram: 10 probability bins (0-10%, 10-20%, ..., 90-100%).
   For each bin: observed frequency of events vs mean forecast probability.
2. Coverage diagnostics: For nominal intervals (50%, 80%, 90%),
   measure what fraction of observations actually fall within the interval.
3. Sharpness diagnostic: Mean interval width for each coverage level.

Computed over historical DEMO/REPLAY verification stream.
"""

import math
from typing import List, Optional
from pydantic import BaseModel

from backend.calibration.bias_correction import VerificationRecord
from backend.probabilistic.exceedance import calculate_exceedance_probability


# --- Models ---
class ReliabilityBin(BaseModel):
    bin_lower: float       # lower probability boundary (0.0-1.0)
    bin_upper: float       # upper probability boundary (0.0-1.0)
    bin_center: float      # midpoint of bin
    mean_forecast_prob: float   # mean forecast probability within this bin
    observed_frequency: float   # fraction of events that actually occurred
    sample_count: int           # number of pairs in this bin
    data_status: str = "demo_replay"


class ReliabilityDiagram(BaseModel):
    variable_id: str
    threshold: float
    unit: str
    bins: List[ReliabilityBin]
    total_samples: int
    data_status: str = "demo_replay"
    note: str = ""


class CoverageDiagnostic(BaseModel):
    nominal_coverage: float       # 0.50, 0.80, or 0.90
    observed_coverage: float      # fraction of obs within interval
    sample_count: int
    mean_interval_width: float    # sharpness for this level
    data_status: str = "demo_replay"


class CoverageSummary(BaseModel):
    model_id: str
    model_name: str
    variable_id: str
    lead_hours: int
    coverages: List[CoverageDiagnostic]
    data_status: str = "demo_replay"
    note: str = ""


# --- Standard Normal helpers ---
def _phi(z: float) -> float:
    return math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)


def _Phi(z: float) -> float:
    return 0.5 * math.erfc(-z / math.sqrt(2.0))


# Z-scores for two-sided prediction intervals
_Z_SCORES = {0.50: 0.674, 0.80: 1.282, 0.90: 1.645}


def compute_reliability_diagram(
    records: List[VerificationRecord],
    threshold: float,
    predictive_sigma: float,
    variable_id: str = "rainfall",
    unit: str = "mm",
    n_bins: int = 10,
) -> ReliabilityDiagram:
    """
    Computes reliability diagram data for a given threshold.

    Steps:
    1. For each record, compute P(forecast > threshold) using Gaussian CDF.
    2. Bin pairs by forecast probability (into n_bins equal-width bins).
    3. Within each bin: compute mean forecast probability and observed frequency.
    """
    sigma = max(0.01, predictive_sigma)

    # Compute probability and event for each record
    pairs: List[tuple] = []
    for r in records:
        prob = calculate_exceedance_probability(r.forecast, sigma, threshold)
        event = 1.0 if r.observed > threshold else 0.0
        pairs.append((prob, event))

    # Build bins
    bin_width = 1.0 / n_bins
    bins: List[ReliabilityBin] = []

    for i in range(n_bins):
        b_lower = i * bin_width
        b_upper = (i + 1) * bin_width
        b_center = round((b_lower + b_upper) / 2.0, 3)

        # Edge: include probability=1.0 in the last bin
        in_bin = [
            (p, e)
            for (p, e) in pairs
            if (b_lower <= p < b_upper) or (i == n_bins - 1 and p == 1.0)
        ]

        count = len(in_bin)
        if count > 0:
            mean_prob = round(sum(p for p, _ in in_bin) / count, 4)
            obs_freq = round(sum(e for _, e in in_bin) / count, 4)
        else:
            mean_prob = round(b_center, 4)
            obs_freq = 0.0

        bins.append(
            ReliabilityBin(
                bin_lower=round(b_lower, 3),
                bin_upper=round(b_upper, 3),
                bin_center=b_center,
                mean_forecast_prob=mean_prob,
                observed_frequency=obs_freq,
                sample_count=count,
            )
        )

    note = ""
    if len(records) < 10:
        note = f"small_sample_n{len(records)}_reliability_may_be_unstable"

    return ReliabilityDiagram(
        variable_id=variable_id,
        threshold=threshold,
        unit=unit,
        bins=bins,
        total_samples=len(records),
        note=note,
    )


def compute_coverage_diagnostics(
    records: List[VerificationRecord],
    predictive_sigma: float,
    model_id: str = "blended",
    model_name: str = "Blended Forecast",
    variable_id: str = "rainfall",
    lead_hours: int = 24,
    is_non_negative: bool = False,
) -> CoverageSummary:
    """
    Computes coverage and sharpness diagnostics for 50%, 80%, 90% intervals.

    For each record, uses r.forecast as predictive mean (mu) and predictive_sigma.
    Observed coverage = fraction of observations within the interval.
    Sharpness = mean interval width.
    """
    sigma = max(0.01, predictive_sigma)

    coverages: List[CoverageDiagnostic] = []
    for nominal, z in _Z_SCORES.items():
        widths: List[float] = []
        hits: int = 0
        n = len(records)

        if n == 0:
            coverages.append(
                CoverageDiagnostic(
                    nominal_coverage=nominal,
                    observed_coverage=0.0,
                    sample_count=0,
                    mean_interval_width=0.0,
                )
            )
            continue

        for r in records:
            mu = r.forecast
            lower = mu - z * sigma
            upper = mu + z * sigma
            if is_non_negative:
                lower = max(0.0, lower)

            width = upper - lower
            widths.append(width)

            if lower <= r.observed <= upper:
                hits += 1

        obs_cov = round(hits / n, 4)
        mean_width = round(sum(widths) / n, 3)

        coverages.append(
            CoverageDiagnostic(
                nominal_coverage=nominal,
                observed_coverage=obs_cov,
                sample_count=n,
                mean_interval_width=mean_width,
            )
        )

    note = ""
    if len(records) < 5:
        note = f"small_sample_n{len(records)}_interpret_with_caution"

    return CoverageSummary(
        model_id=model_id,
        model_name=model_name,
        variable_id=variable_id,
        lead_hours=lead_hours,
        coverages=coverages,
        note=note,
    )
