"""
API Routes for Multi-Model Forecast Blending System.
Steps 1, 3, 4 & 5 Endpoints (Probabilistic Forecasting, CRPS, Reliability, Rolling Skill).
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query
from datetime import datetime, timezone

from backend.schemas import (
    ForecastSource,
    Observation,
    ModelHealth,
    ModelSkill,
    ModelWeight,
    SystemConfigResponse,
)
from backend.utils.config import AppConfig
from backend.adapters.demo_adapter import DemoAdapter
from backend.calibration.bias_correction import (
    get_context_calibration,
    load_verification_records,
    CalibrationResult,
)
from backend.blending.trust_engine import (
    compute_dynamic_trust_blend,
    calculate_model_skill,
    ModelSkillMetrics,
    AdaptiveBlendResult,
)
from backend.probabilistic.distribution import (
    compute_model_probabilistic_forecast,
    compute_probabilistic_blend,
    BlendedProbabilisticForecast,
    ModelProbabilisticForecast,
)
from backend.probabilistic.exceedance import (
    calculate_exceedance_probability,
    evaluate_threshold_exceedance,
    get_variable_threshold_presets,
    ThresholdExceedanceResult,
)
from backend.probabilistic.brier import (
    calculate_brier_score,
    BrierScoreResult,
)
from backend.probabilistic.crps import (
    compute_crps_for_model,
    CRPSResult,
    CRPSSummary,
)
from backend.probabilistic.reliability import (
    compute_reliability_diagram,
    compute_coverage_diagnostics,
    ReliabilityDiagram,
    CoverageSummary,
)
from backend.probabilistic.rolling_skill import (
    compute_rolling_skill_summary,
    RollingSkillSummary,
    TrustChangeExplanation,
)

router = APIRouter(prefix="/api")


@router.get("/health", summary="System operational status and data configuration")
def get_health() -> Dict[str, Any]:
    cfg = AppConfig.get_configured_sources()
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "project": cfg.project_name,
        "organization": cfg.organization,
        "environment": cfg.environment,
        "data_mode": cfg.data_mode,
        "notice": "Step 5 CRPS, Reliability & Rolling Skill Monitoring Active."
    }


@router.get("/config", response_model=SystemConfigResponse, summary="Get full system configuration")
def get_config() -> SystemConfigResponse:
    return AppConfig.get_configured_sources()


@router.get("/models", summary="List configured NWP and AI weather models")
def get_models() -> List[Dict[str, Any]]:
    demo_data = DemoAdapter.load_demo_data()
    return demo_data.get("models", [])


@router.get("/forecasts", response_model=List[ForecastSource], summary="Get raw multi-model forecast feeds")
def get_forecasts(source_id: str = Query(None, description="Filter by model source ID")) -> List[ForecastSource]:
    forecasts = DemoAdapter.get_forecasts()
    if source_id:
        forecasts = [f for f in forecasts if f.source_id == source_id]
    return forecasts


@router.get("/observations", response_model=List[Observation], summary="Get meteorological observations")
def get_observations(source: str = Query(None, description="Filter by observation source")) -> List[Observation]:
    obs = DemoAdapter.get_observations()
    if source:
        obs = [o for o in obs if o.source == source]
    return obs


@router.get("/model-health", response_model=List[ModelHealth], summary="Get model feed latency and health metrics")
def get_model_health() -> List[ModelHealth]:
    return DemoAdapter.get_health()


@router.get("/model-weights", response_model=List[ModelWeight], summary="Get current multi-model blend weights")
def get_model_weights() -> List[ModelWeight]:
    return DemoAdapter.get_weights()


@router.get("/verification", response_model=List[ModelSkill], summary="Get historical skill and verification metrics")
def get_verification() -> List[ModelSkill]:
    return DemoAdapter.get_verification()


# --- STEP 3 ENDPOINTS ---

@router.get("/calibration", response_model=CalibrationResult, summary="Get context-aware bias correction for a forecast")
def get_calibration(
    raw_forecast: float = Query(..., description="Raw model forecast value"),
    model_id: str = Query(..., description="Model ID (e.g., ncmrwf_ncum)"),
    location_id: str = Query("DELHI", description="Location ID (e.g., DELHI)"),
    variable_id: str = Query("rainfall", description="Variable ID (e.g., rainfall)"),
    lead_hours: int = Query(24, description="Lead time in hours"),
    unit: str = Query("mm", description="Measurement unit"),
) -> CalibrationResult:
    return get_context_calibration(
        raw_forecast=raw_forecast,
        model_id=model_id,
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        unit=unit,
    )


@router.get("/verification/replay", summary="Get historical verification replay metrics per model")
def get_verification_replay(
    location_id: Optional[str] = Query(None, description="Optional location filter"),
    variable_id: Optional[str] = Query(None, description="Optional variable filter"),
    lead_hours: Optional[int] = Query(None, description="Optional lead time filter"),
) -> Dict[str, Any]:
    records = load_verification_records()
    if location_id:
        records = [r for r in records if r.locationId.upper() == location_id.upper()]
    if variable_id:
        records = [r for r in records if r.variableId.lower() == variable_id.lower()]
    if lead_hours:
        records = [r for r in records if r.leadHours == lead_hours]

    models = ["ncmrwf_ncum", "ncmrwf_neps", "ai_graphcast"]
    metrics: Dict[str, Any] = {}
    for m in models:
        m_records = [r for r in records if r.modelId == m]
        metrics[m] = calculate_model_skill(m_records).model_dump()

    return {
        "location_id": location_id,
        "variable_id": variable_id,
        "lead_hours": lead_hours,
        "total_records": len(records),
        "metrics_by_model": metrics,
        "data_status": "demo_replay",
    }


@router.get("/adaptive-weights", response_model=AdaptiveBlendResult, summary="Compute dynamic trust scores, weights, and blend")
def get_adaptive_weights(
    location_id: str = Query("DELHI", description="Target location ID"),
    variable_id: str = Query("rainfall", description="Meteorological variable"),
    lead_hours: int = Query(24, description="Forecast lead time in hours"),
    strategy: str = Query("adaptive_skill", description="'adaptive_skill' or 'equal_baseline'"),
    ncum_raw: float = Query(14.2, description="NCUM forecast value"),
    neps_raw: float = Query(16.5, description="NEPS forecast value"),
    ai_raw: float = Query(12.8, description="AI Model forecast value"),
    ncum_active: bool = Query(True, description="Is NCUM active"),
    neps_active: bool = Query(True, description="Is NEPS active"),
    ai_active: bool = Query(True, description="Is AI Model active"),
    unit: str = Query("mm", description="Measurement unit"),
) -> AdaptiveBlendResult:
    raw_map = {
        "ncmrwf_ncum": ncum_raw,
        "ncmrwf_neps": neps_raw,
        "ai_graphcast": ai_raw,
    }
    switches = {
        "ncmrwf_ncum": ncum_active,
        "ncmrwf_neps": neps_active,
        "ai_graphcast": ai_active,
    }
    return compute_dynamic_trust_blend(
        raw_forecasts=raw_map,
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        unit=unit,
        model_switches=switches,
        strategy=strategy,
    )


# --- STEP 4 ENDPOINTS ---

@router.get("/probabilistic-forecast", response_model=BlendedProbabilisticForecast, summary="Compute probabilistic blend with uncertainty intervals")
def get_probabilistic_forecast(
    location_id: str = Query("DELHI", description="Target location ID"),
    variable_id: str = Query("rainfall", description="Meteorological variable"),
    lead_hours: int = Query(24, description="Forecast lead time in hours"),
    strategy: str = Query("adaptive_skill", description="'adaptive_skill' or 'equal_baseline'"),
    ncum_raw: float = Query(14.2, description="NCUM forecast value"),
    neps_raw: float = Query(16.5, description="NEPS forecast value"),
    ai_raw: float = Query(12.8, description="AI Model forecast value"),
    ncum_active: bool = Query(True, description="Is NCUM active"),
    neps_active: bool = Query(True, description="Is NEPS active"),
    ai_active: bool = Query(True, description="Is AI Model active"),
    unit: str = Query("mm", description="Measurement unit"),
) -> BlendedProbabilisticForecast:
    # 1. Compute Step 3 Adaptive Weights & Calibrations
    blend_res = get_adaptive_weights(
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        strategy=strategy,
        ncum_raw=ncum_raw,
        neps_raw=neps_raw,
        ai_raw=ai_raw,
        ncum_active=ncum_active,
        neps_active=neps_active,
        ai_active=ai_active,
        unit=unit,
    )

    records = load_verification_records()

    # 2. Build model-level Gaussian distributions
    model_prob_list: List[ModelProbabilisticForecast] = []
    for m in blend_res.models:
        rec_slice = [
            r for r in records
            if r.modelId == m.model_id
            and (r.locationId.upper() == location_id.upper() or r.variableId.lower() == variable_id.lower())
            and r.leadHours == lead_hours
        ]
        weight_val = m.adaptive_weight if strategy == "adaptive_skill" else m.equal_weight
        mp = compute_model_probabilistic_forecast(
            model_id=m.model_id,
            model_name=m.model_name,
            raw_forecast=m.raw_forecast,
            calibrated_mean=m.calibrated_forecast,
            variable_id=variable_id,
            weight=weight_val,
            is_active=m.is_active,
            records=rec_slice,
        )
        model_prob_list.append(mp)

    return compute_probabilistic_blend(
        models=model_prob_list,
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        unit=unit,
        strategy=strategy,
    )


@router.get("/threshold-probability", response_model=ThresholdExceedanceResult, summary="Calculate probability of exceeding specific threshold")
def get_threshold_probability(
    mean: float = Query(..., description="Predictive mean"),
    sigma: float = Query(..., description="Predictive standard deviation"),
    threshold: float = Query(..., description="Threshold level to evaluate"),
    variable_id: str = Query("rainfall", description="Meteorological variable"),
    unit: str = Query("mm", description="Measurement unit"),
) -> ThresholdExceedanceResult:
    return evaluate_threshold_exceedance(
        mean=mean,
        sigma=sigma,
        threshold=threshold,
        variable_id=variable_id,
        unit=unit,
    )


@router.get("/probabilistic-verification", response_model=List[BrierScoreResult], summary="Compute Brier score threshold verification")
def get_probabilistic_verification(
    location_id: str = Query("DELHI", description="Target location ID"),
    variable_id: str = Query("rainfall", description="Meteorological variable"),
    lead_hours: int = Query(24, description="Forecast lead time"),
    sigma: float = Query(1.8, description="Predictive sigma"),
    unit: str = Query("mm", description="Measurement unit"),
) -> List[BrierScoreResult]:
    records = load_verification_records()
    context_records = [
        r for r in records
        if r.locationId.upper() == location_id.upper()
        and r.variableId.lower() == variable_id.lower()
        and r.leadHours == lead_hours
    ]

    presets = get_variable_threshold_presets(variable_id)
    results: List[BrierScoreResult] = []
    for th in presets:
        brier = calculate_brier_score(
            records=context_records,
            threshold=th,
            predictive_sigma=sigma,
            variable_id=variable_id,
            unit=unit,
        )
        results.append(brier)

    return results


# --- STEP 5 ENDPOINTS ---

@router.get("/crps", response_model=CRPSSummary, summary="Compute Gaussian CRPS for all models")
def get_crps(
    location_id: str = Query("DELHI", description="Target location ID"),
    variable_id: str = Query("rainfall", description="Meteorological variable"),
    lead_hours: int = Query(24, description="Forecast lead time in hours"),
    unit: str = Query("mm", description="Measurement unit"),
) -> CRPSSummary:
    """
    Computes mean Gaussian CRPS (closed-form) for each model using the
    DEMO/REPLAY verification dataset and model-specific error sigma.
    """
    all_records = load_verification_records()
    context_records = [
        r for r in all_records
        if r.locationId.upper() == location_id.upper()
        and r.variableId.lower() == variable_id.lower()
        and r.leadHours == lead_hours
    ]

    model_ids = ["ncmrwf_ncum", "ncmrwf_neps", "ai_graphcast"]
    model_names = {
        "ncmrwf_ncum": "NCMRWF NCUM",
        "ncmrwf_neps": "NCMRWF NEPS",
        "ai_graphcast": "AI Weather Model",
    }

    results: List[CRPSResult] = []
    for mid in model_ids:
        m_records = [r for r in context_records if r.modelId == mid]
        # Use error dispersion as sigma (same as Step 4)
        from backend.probabilistic.distribution import calculate_error_dispersion
        sigma = calculate_error_dispersion(m_records)
        crps_res = compute_crps_for_model(
            model_id=mid,
            model_name=model_names.get(mid, mid),
            records=m_records,
            predictive_sigma=sigma,
        )
        results.append(crps_res)

    return CRPSSummary(
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        results=results,
    )


@router.get("/reliability", response_model=ReliabilityDiagram, summary="Reliability diagram for a threshold")
def get_reliability(
    location_id: str = Query("DELHI", description="Target location ID"),
    variable_id: str = Query("rainfall", description="Meteorological variable"),
    lead_hours: int = Query(24, description="Forecast lead time in hours"),
    threshold: float = Query(10.0, description="Threshold level to evaluate (e.g., 10 mm)"),
    sigma: float = Query(1.8, description="Predictive sigma for the blended forecast"),
    unit: str = Query("mm", description="Measurement unit"),
) -> ReliabilityDiagram:
    """
    Computes reliability diagram data (10 bins) for a given threshold over
    the DEMO/REPLAY verification dataset.
    """
    all_records = load_verification_records()
    context_records = [
        r for r in all_records
        if r.locationId.upper() == location_id.upper()
        and r.variableId.lower() == variable_id.lower()
        and r.leadHours == lead_hours
    ]

    return compute_reliability_diagram(
        records=context_records,
        threshold=threshold,
        predictive_sigma=sigma,
        variable_id=variable_id,
        unit=unit,
    )


@router.get("/rolling-skill", response_model=RollingSkillSummary, summary="Exponential rolling skill monitor for all models")
def get_rolling_skill(
    location_id: str = Query("DELHI", description="Target location ID"),
    variable_id: str = Query("rainfall", description="Meteorological variable"),
    lead_hours: int = Query(24, description="Forecast lead time in hours"),
    unit: str = Query("mm", description="Measurement unit"),
) -> RollingSkillSummary:
    """
    Computes exponential rolling MAE, RMSE, Bias, and CRPS (lambda=0.8)
    for each model using the DEMO/REPLAY verification dataset.
    """
    from backend.probabilistic.distribution import calculate_error_dispersion

    all_records = load_verification_records()
    context_records = [
        r for r in all_records
        if r.locationId.upper() == location_id.upper()
        and r.variableId.lower() == variable_id.lower()
        and r.leadHours == lead_hours
    ]

    model_ids = ["ncmrwf_ncum", "ncmrwf_neps", "ai_graphcast"]
    sigmas = {}
    for mid in model_ids:
        m_recs = [r for r in context_records if r.modelId == mid]
        sigmas[mid] = calculate_error_dispersion(m_recs)

    return compute_rolling_skill_summary(
        records=context_records,
        predictive_sigmas=sigmas,
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        unit=unit,
    )


@router.get("/trust-explanations", response_model=List[TrustChangeExplanation], summary="Trust weight change explanations with rolling skill evidence")
def get_trust_explanations(
    location_id: str = Query("DELHI", description="Target location ID"),
    variable_id: str = Query("rainfall", description="Meteorological variable"),
    lead_hours: int = Query(24, description="Forecast lead time in hours"),
    unit: str = Query("mm", description="Measurement unit"),
) -> List[TrustChangeExplanation]:
    """
    Returns per-model trust explanations derived from rolling-skill metrics,
    comparing exponential rolling MAE-based adaptive weights to equal-weight baseline.
    """
    summary = get_rolling_skill(
        location_id=location_id,
        variable_id=variable_id,
        lead_hours=lead_hours,
        unit=unit,
    )
    return summary.trust_explanations
