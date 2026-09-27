"""
Unit Tests for Core Schemas in Step 1.
"""

import pytest
from backend.schemas import (
    ForecastSource,
    Observation,
    ModelHealth,
    ModelSkill,
    ModelWeight,
    EnsembleInfo
)


def test_forecast_source_schema():
    fc = ForecastSource(
        source_id="ncmrwf_ncum",
        source_name="NCMRWF NCUM",
        model_type="nwp_deterministic",
        forecast_time="2026-09-26T00:00:00Z",
        issue_time="2026-09-26T03:00:00Z",
        valid_time="2026-09-26T12:00:00Z",
        latitude=28.61,
        longitude=77.20,
        variable="temperature_2m",
        lead_time=12,
        value=305.15,
        unit="K",
        data_status="demo_replay"
    )
    assert fc.source_id == "ncmrwf_ncum"
    assert fc.value == 305.15
    assert fc.data_status == "demo_replay"


def test_observation_schema():
    obs = Observation(
        observation_id="OBS_001",
        timestamp="2026-09-26T12:00:00Z",
        latitude=28.61,
        longitude=77.20,
        variable="temperature_2m",
        value=305.0,
        unit="K",
        source="AWS_INDIA"
    )
    assert obs.observation_id == "OBS_001"
    assert obs.source == "AWS_INDIA"


def test_model_health_schema():
    mh = ModelHealth(
        source_id="ncmrwf_neps",
        freshness="on_schedule",
        availability=0.98,
        latency=45.0,
        missing_data=False,
        anomaly_status="normal",
        health_status="healthy",
        last_successful_update="2026-09-26T03:30:00Z"
    )
    assert mh.availability == 0.98
    assert mh.health_status == "healthy"


def test_model_skill_schema():
    ms = ModelSkill(
        source_id="ai_graphcast",
        region="PAN_INDIA",
        variable="temperature_2m",
        lead_time=24,
        season="MONSOON",
        weather_regime="MONSOON_TROUGH",
        metric="RMSE",
        score=1.35,
        verification_period="LAST_30_DAYS"
    )
    assert ms.metric == "RMSE"
    assert ms.score == 1.35


def test_model_weight_schema():
    mw = ModelWeight(
        source_id="ncmrwf_ncum",
        weight=0.34,
        reason="Baseline Equal Weight",
        calculated_at="2026-09-26T11:00:00Z"
    )
    assert mw.weight == 0.34
