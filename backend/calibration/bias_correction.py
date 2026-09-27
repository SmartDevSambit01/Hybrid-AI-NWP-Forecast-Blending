"""
Pure Context-Aware Calibration & Mean Bias Correction Module.
Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 3.

Implements transparent, explainable mean bias correction:
bias = mean(forecast - observed)
calibrated_forecast = max(0, raw_forecast - bias) [for non-negative variables]
"""

import json
import os
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


VERIFICATION_FILE = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "demo", "verification_replay.json"
)


class VerificationRecord(BaseModel):
    locationId: str
    variableId: str
    leadHours: int
    validTime: str
    modelId: str
    forecast: float
    observed: float
    dataStatus: str = "demo_replay"


class CalibrationResult(BaseModel):
    model_id: str
    raw_forecast: float
    bias: float
    calibrated_forecast: float
    sample_count: int
    calibration_source: str = Field(
        description="'Location-specific', 'Variable/lead fallback', or 'No correction'"
    )
    unit: str = "mm"
    data_status: str = "demo_replay"


def load_verification_records() -> List[VerificationRecord]:
    """Loads deterministic historical verification replay records."""
    if os.path.exists(VERIFICATION_FILE):
        with open(VERIFICATION_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [VerificationRecord(**r) for r in data.get("records", [])]
    return []


def calculate_bias(records: List[VerificationRecord]) -> float:
    """
    Computes mean forecast error (bias):
    bias = (1 / N) * sum(forecast_i - observed_i)
    """
    if not records:
        return 0.0
    total_error = sum(r.forecast - r.observed for r in records)
    return round(total_error / len(records), 3)


def apply_bias_correction(
    raw_forecast: float,
    bias: float,
    variable_id: str = "rainfall"
) -> float:
    """
    Applies calibrated correction:
    calibrated = raw_forecast - bias
    Applies physical boundary (>= 0 for precipitation/wind speed).
    """
    corrected = raw_forecast - bias
    if variable_id in ["rainfall", "precip_surface", "wind_speed", "wind_speed_10m"]:
        corrected = max(0.0, corrected)
    return round(corrected, 2)


def get_context_calibration(
    raw_forecast: float,
    model_id: str,
    location_id: str,
    variable_id: str,
    lead_hours: int,
    unit: str = "mm",
    records: Optional[List[VerificationRecord]] = None
) -> CalibrationResult:
    """
    Context-aware calibration with hierarchical fallback:
    1. Location + Variable + Lead Time + Model
    2. Variable + Lead Time + Model
    3. Zero bias fallback
    """
    all_records = records if records is not None else load_verification_records()

    # Level 1: Location-specific match
    loc_match = [
        r for r in all_records
        if r.modelId == model_id
        and r.locationId.upper() == location_id.upper()
        and r.variableId.lower() == variable_id.lower()
        and r.leadHours == lead_hours
    ]

    if loc_match:
        bias = calculate_bias(loc_match)
        calibrated = apply_bias_correction(raw_forecast, bias, variable_id)
        return CalibrationResult(
            model_id=model_id,
            raw_forecast=raw_forecast,
            bias=bias,
            calibrated_forecast=calibrated,
            sample_count=len(loc_match),
            calibration_source="Location-specific",
            unit=unit,
        )

    # Level 2: Variable + Lead Time fallback
    fallback_match = [
        r for r in all_records
        if r.modelId == model_id
        and r.variableId.lower() == variable_id.lower()
        and r.leadHours == lead_hours
    ]

    if fallback_match:
        bias = calculate_bias(fallback_match)
        calibrated = apply_bias_correction(raw_forecast, bias, variable_id)
        return CalibrationResult(
            model_id=model_id,
            raw_forecast=raw_forecast,
            bias=bias,
            calibrated_forecast=calibrated,
            sample_count=len(fallback_match),
            calibration_source="Variable/lead fallback",
            unit=unit,
        )

    # Level 3: No correction
    return CalibrationResult(
        model_id=model_id,
        raw_forecast=raw_forecast,
        bias=0.0,
        calibrated_forecast=raw_forecast,
        sample_count=0,
        calibration_source="No correction",
        unit=unit,
    )
