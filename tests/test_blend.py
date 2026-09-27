"""
Unit tests for Baseline Equal-Weight Multi-Model Forecast Blending Engine.
Step 2 Verification (Tests 1 through 9).
"""

import pytest
from backend.blending.engine import (
    ModelForecastInput,
    compute_equal_weight_blend,
)


@pytest.fixture
def standard_forecasts():
    return [
        ModelForecastInput(model_id="ncmrwf_ncum", model_name="NCUM", value=14.2, unit="mm"),
        ModelForecastInput(model_id="ncmrwf_neps", model_name="NEPS", value=16.5, unit="mm"),
        ModelForecastInput(model_id="ai_graphcast", model_name="AI GraphCast", value=12.8, unit="mm"),
    ]


def test_1_all_three_models_active(standard_forecasts):
    """Test 1: All three models active -> 33.33% weights each, blend computed"""
    res = compute_equal_weight_blend(standard_forecasts)
    assert res.status == "ready"
    assert res.active_count == 3
    assert res.total_models == 3
    assert res.blended_value == 14.50
    assert res.unit == "mm"
    for mw in res.model_weights:
        assert mw.is_active is True
        assert pytest.approx(mw.weight, 0.001) == 0.3333


def test_2_ai_disabled(standard_forecasts):
    """Test 2: AI disabled -> NCUM 50%, NEPS 50%, AI 0%"""
    switches = {"ncmrwf_ncum": True, "ncmrwf_neps": True, "ai_graphcast": False}
    res = compute_equal_weight_blend(standard_forecasts, switches)
    assert res.status == "ready"
    assert res.active_count == 2
    assert res.blended_value == 15.35

    ncum_w = next(mw for mw in res.model_weights if mw.model_id == "ncmrwf_ncum")
    neps_w = next(mw for mw in res.model_weights if mw.model_id == "ncmrwf_neps")
    ai_w = next(mw for mw in res.model_weights if mw.model_id == "ai_graphcast")
    assert ncum_w.weight == 0.5
    assert neps_w.weight == 0.5
    assert ai_w.weight == 0.0
    assert ai_w.is_active is False


def test_3_only_ncum_active(standard_forecasts):
    """Test 3: Only NCUM active -> NCUM 100%, blend equals NCUM value"""
    switches = {"ncmrwf_ncum": True, "ncmrwf_neps": False, "ai_graphcast": False}
    res = compute_equal_weight_blend(standard_forecasts, switches)
    assert res.status == "ready"
    assert res.active_count == 1
    assert res.blended_value == 14.20
    ncum_w = next(mw for mw in res.model_weights if mw.model_id == "ncmrwf_ncum")
    assert ncum_w.weight == 1.0
    assert ncum_w.is_active is True


def test_4_all_models_disabled(standard_forecasts):
    """Test 4: All models disabled -> controlled empty state with no crash/NaN"""
    switches = {"ncmrwf_ncum": False, "ncmrwf_neps": False, "ai_graphcast": False}
    res = compute_equal_weight_blend(standard_forecasts, switches)
    assert res.status == "no_active_models"
    assert res.active_count == 0
    assert res.blended_value is None
    assert "No active forecast models" in res.message
    for mw in res.model_weights:
        assert mw.weight == 0.0
        assert mw.is_active is False


def test_5_blend_calculation_example():
    """Test 5: NCUM=10, NEPS=20, AI=30 -> Expected Baseline Blend = 20.00"""
    custom_forecasts = [
        ModelForecastInput(model_id="ncmrwf_ncum", model_name="NCUM", value=10.0, unit="mm"),
        ModelForecastInput(model_id="ncmrwf_neps", model_name="NEPS", value=20.0, unit="mm"),
        ModelForecastInput(model_id="ai_graphcast", model_name="AI", value=30.0, unit="mm"),
    ]
    res = compute_equal_weight_blend(custom_forecasts)
    assert res.blended_value == 20.00
    assert res.active_count == 3


def test_6_changing_location_values():
    """Test 6: Different locations produce different realistic forecast inputs"""
    delhi_fc = [
        ModelForecastInput(model_id="ncmrwf_ncum", model_name="NCUM", value=14.2, unit="mm"),
        ModelForecastInput(model_id="ncmrwf_neps", model_name="NEPS", value=16.5, unit="mm"),
        ModelForecastInput(model_id="ai_graphcast", model_name="AI", value=12.8, unit="mm"),
    ]
    mumbai_fc = [
        ModelForecastInput(model_id="ncmrwf_ncum", model_name="NCUM", value=72.0, unit="mm"),
        ModelForecastInput(model_id="ncmrwf_neps", model_name="NEPS", value=84.0, unit="mm"),
        ModelForecastInput(model_id="ai_graphcast", model_name="AI", value=68.5, unit="mm"),
    ]
    delhi_res = compute_equal_weight_blend(delhi_fc)
    mumbai_res = compute_equal_weight_blend(mumbai_fc)
    assert delhi_res.blended_value != mumbai_res.blended_value
    assert delhi_res.blended_value == 14.50
    assert mumbai_res.blended_value == 74.83


def test_7_changing_variable_values():
    """Test 7: Changing variable changes units and blended values"""
    rain_fc = [
        ModelForecastInput(model_id="ncmrwf_ncum", model_name="NCUM", value=14.2, unit="mm"),
        ModelForecastInput(model_id="ncmrwf_neps", model_name="NEPS", value=16.5, unit="mm"),
        ModelForecastInput(model_id="ai_graphcast", model_name="AI", value=12.8, unit="mm"),
    ]
    temp_fc = [
        ModelForecastInput(model_id="ncmrwf_ncum", model_name="NCUM", value=32.0, unit="°C"),
        ModelForecastInput(model_id="ncmrwf_neps", model_name="NEPS", value=31.7, unit="°C"),
        ModelForecastInput(model_id="ai_graphcast", model_name="AI", value=32.4, unit="°C"),
    ]
    rain_res = compute_equal_weight_blend(rain_fc)
    temp_res = compute_equal_weight_blend(temp_fc)
    assert rain_res.unit == "mm"
    assert temp_res.unit == "°C"
    assert rain_res.blended_value == 14.50
    assert temp_res.blended_value == 32.03


def test_8_changing_lead_time_values():
    """Test 8: Lead time progression changes values"""
    lead_12h = [
        ModelForecastInput(model_id="ncmrwf_ncum", model_name="NCUM", value=2.4, unit="mm"),
        ModelForecastInput(model_id="ncmrwf_neps", model_name="NEPS", value=3.1, unit="mm"),
        ModelForecastInput(model_id="ai_graphcast", model_name="AI", value=1.8, unit="mm"),
    ]
    lead_48h = [
        ModelForecastInput(model_id="ncmrwf_ncum", model_name="NCUM", value=38.0, unit="mm"),
        ModelForecastInput(model_id="ncmrwf_neps", model_name="NEPS", value=42.4, unit="mm"),
        ModelForecastInput(model_id="ai_graphcast", model_name="AI", value=34.6, unit="mm"),
    ]
    res_12 = compute_equal_weight_blend(lead_12h)
    res_48 = compute_equal_weight_blend(lead_48h)
    assert res_12.blended_value == 2.43
    assert res_48.blended_value == 38.33
    assert res_48.blended_value > res_12.blended_value


def test_9_deterministic_repeatability():
    """Test 9: Same inputs always yield identical deterministic results across multiple evaluations"""
    fc = [
        ModelForecastInput(model_id="ncmrwf_ncum", model_name="NCUM", value=24.0, unit="km/h"),
        ModelForecastInput(model_id="ncmrwf_neps", model_name="NEPS", value=22.5, unit="km/h"),
        ModelForecastInput(model_id="ai_graphcast", model_name="AI", value=25.1, unit="km/h"),
    ]
    res1 = compute_equal_weight_blend(fc)
    res2 = compute_equal_weight_blend(fc)
    res3 = compute_equal_weight_blend(fc)
    assert res1.blended_value == res2.blended_value == res3.blended_value == 23.87
    assert res1.model_weights[0].weight == res2.model_weights[0].weight == 0.3333
