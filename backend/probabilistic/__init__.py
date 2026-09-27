"""
Probabilistic Forecasting Package for Multi-Model Forecast Blending System.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Steps 4 & 5.
"""

from .distribution import (
    calculate_error_dispersion,
    calculate_intervals,
    compute_model_probabilistic_forecast,
    compute_probabilistic_blend,
    classify_model_disagreement,
    ModelProbabilisticForecast,
    BlendedProbabilisticForecast,
    PredictionInterval,
)
from .exceedance import (
    calculate_exceedance_probability,
    classify_probability_band,
    get_variable_threshold_presets,
    evaluate_threshold_exceedance,
    ThresholdExceedanceResult,
)
from .brier import (
    calculate_brier_score,
    BrierScoreResult,
)
from .crps import (
    crps_gaussian_single,
    compute_crps_for_model,
    CRPSResult,
    CRPSSummary,
)
from .reliability import (
    compute_reliability_diagram,
    compute_coverage_diagnostics,
    ReliabilityBin,
    ReliabilityDiagram,
    CoverageDiagnostic,
    CoverageSummary,
)
from .rolling_skill import (
    compute_rolling_skill,
    compute_trust_explanations,
    compute_rolling_skill_summary,
    RollingMetric,
    RollingSkillResult,
    TrustChangeExplanation,
    RollingSkillSummary,
)

__all__ = [
    # Step 4
    "calculate_error_dispersion",
    "calculate_intervals",
    "compute_model_probabilistic_forecast",
    "compute_probabilistic_blend",
    "classify_model_disagreement",
    "ModelProbabilisticForecast",
    "BlendedProbabilisticForecast",
    "PredictionInterval",
    "calculate_exceedance_probability",
    "classify_probability_band",
    "get_variable_threshold_presets",
    "evaluate_threshold_exceedance",
    "ThresholdExceedanceResult",
    "calculate_brier_score",
    "BrierScoreResult",
    # Step 5 — CRPS
    "crps_gaussian_single",
    "compute_crps_for_model",
    "CRPSResult",
    "CRPSSummary",
    # Step 5 — Reliability
    "compute_reliability_diagram",
    "compute_coverage_diagnostics",
    "ReliabilityBin",
    "ReliabilityDiagram",
    "CoverageDiagnostic",
    "CoverageSummary",
    # Step 5 — Rolling Skill
    "compute_rolling_skill",
    "compute_trust_explanations",
    "compute_rolling_skill_summary",
    "RollingMetric",
    "RollingSkillResult",
    "TrustChangeExplanation",
    "RollingSkillSummary",
]
