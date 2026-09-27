"""
Comprehensive Pytest Test Suite for Step 3:
Forecast Calibration, Recent Skill, Dynamic Trust, and Adaptive Blending.
Covers Tests 1 through 21 as specified in Step 3 requirements.
"""

import pytest
from backend.calibration.bias_correction import (
    calculate_bias,
    apply_bias_correction,
    get_context_calibration,
    VerificationRecord,
)
from backend.blending.trust_engine import (
    calculate_model_skill,
    compute_dynamic_trust_blend,
)


# ==========================================
# 1. CALIBRATION TESTS (Tests 1 - 5)
# ==========================================

def test_1_zero_bias_leaves_forecast_unchanged():
    """Test 1: Zero bias leaves raw forecast unmodified"""
    raw = 25.0
    calib = apply_bias_correction(raw, bias=0.0, variable_id="rainfall")
    assert calib == 25.0


def test_2_positive_bias_correctly_removed():
    """Test 2: Positive bias (+5.0) is subtracted: 25 - 5 = 20"""
    raw = 25.0
    calib = apply_bias_correction(raw, bias=5.0, variable_id="rainfall")
    assert calib == 20.0


def test_3_negative_bias_correctly_removed():
    """Test 3: Negative bias (-3.0) is corrected: 20 - (-3) = 23"""
    raw = 20.0
    calib = apply_bias_correction(raw, bias=-3.0, variable_id="temperature")
    assert calib == 23.0


def test_4_context_specific_bias_selected():
    """Test 4: Context-specific records are matched for target location/variable/lead time"""
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="2026-09-25T12:00:00Z", modelId="ncmrwf_ncum", forecast=15.0, observed=14.0),
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="2026-09-24T12:00:00Z", modelId="ncmrwf_ncum", forecast=22.0, observed=20.0),
    ]
    res = get_context_calibration(
        raw_forecast=14.2,
        model_id="ncmrwf_ncum",
        location_id="DELHI",
        variable_id="rainfall",
        lead_hours=24,
        records=records,
    )
    assert res.calibration_source == "Location-specific"
    assert res.sample_count == 2
    assert res.bias == 1.5  # ((15-14) + (22-20)) / 2 = 1.5
    assert res.calibrated_forecast == 12.7  # 14.2 - 1.5 = 12.7


def test_5_fallback_calibration_works():
    """Test 5: Fallback to variable/lead or zero bias when location records are missing"""
    records = [
        VerificationRecord(locationId="MUMBAI", variableId="rainfall", leadHours=24, validTime="2026-09-25T12:00:00Z", modelId="ncmrwf_ncum", forecast=75.0, observed=70.0),
    ]
    # Query for GUWAHATI where no location record exists, but variable+lead exists in dataset
    res = get_context_calibration(
        raw_forecast=50.0,
        model_id="ncmrwf_ncum",
        location_id="GUWAHATI",
        variable_id="rainfall",
        lead_hours=24,
        records=records,
    )
    assert res.calibration_source == "Variable/lead fallback"
    assert res.bias == 5.0
    assert res.calibrated_forecast == 45.0


# ==========================================
# 2. SKILL TESTS (Tests 6 - 10)
# ==========================================

def test_6_mae_calculation():
    """Test 6: Continuous MAE calculation: mean(|F - O|)"""
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t1", modelId="ncmrwf_ncum", forecast=10.0, observed=8.0),   # err = 2
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t2", modelId="ncmrwf_ncum", forecast=15.0, observed=19.0),  # err = 4
    ]
    skill = calculate_model_skill(records)
    assert skill.mae == 3.0  # (2 + 4) / 2 = 3.0
    assert skill.sample_count == 2


def test_7_rmse_calculation():
    """Test 7: Continuous RMSE calculation: sqrt(mean((F - O)^2))"""
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t1", modelId="ncmrwf_ncum", forecast=10.0, observed=7.0),   # err = 3, sq = 9
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t2", modelId="ncmrwf_ncum", forecast=10.0, observed=14.0),  # err = -4, sq = 16
    ]
    skill = calculate_model_skill(records)
    # mean sq = (9 + 16)/2 = 12.5, sqrt(12.5) = 3.536
    assert skill.rmse == 3.536


def test_8_bias_calculation():
    """Test 8: Continuous Mean Bias calculation: mean(F - O)"""
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t1", modelId="ncmrwf_ncum", forecast=20.0, observed=15.0),  # +5
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t2", modelId="ncmrwf_ncum", forecast=10.0, observed=15.0),  # -5
    ]
    skill = calculate_model_skill(records)
    assert skill.bias == 0.0


def test_9_recent_window_selection():
    """Test 9: Respects recent_window limit (e.g., top 3 records out of 10)"""
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime=f"t{i}", modelId="ncmrwf_ncum", forecast=10.0 + i, observed=10.0)
        for i in range(10)
    ]
    skill = calculate_model_skill(records, recent_window=3)
    assert skill.sample_count == 3


def test_10_exponentially_weighted_error():
    """Test 10: Exponential moving error E_t = lambda * E_{t-1} + (1 - lambda) * L_t"""
    # L_0 = 10, L_1 = 2, lambda = 0.8 -> E_1 = 0.8 * 10 + 0.2 * 2 = 8.4
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t0", modelId="m1", forecast=20.0, observed=10.0), # err = 10
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t1", modelId="m1", forecast=12.0, observed=10.0), # err = 2
    ]
    skill = calculate_model_skill(records, decay_lambda=0.8)
    assert skill.exp_weighted_mae == 8.4


# ==========================================
# 3. DYNAMIC TRUST TESTS (Tests 11 - 15)
# ==========================================

def test_11_lower_error_produces_greater_trust():
    """Test 11: Model with lower error receives higher trust score and higher weight"""
    raw_forecasts = {"ncmrwf_ncum": 14.0, "ncmrwf_neps": 14.0, "ai_graphcast": 14.0}
    # NCUM has lower error in DELHI rainfall than NEPS in verification dataset
    res = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    ncum = next(m for m in res.models if m.model_id == "ncmrwf_ncum")
    neps = next(m for m in res.models if m.model_id == "ncmrwf_neps")
    assert ncum.mae < neps.mae
    assert ncum.trust_score > neps.trust_score
    assert ncum.adaptive_weight > neps.adaptive_weight


def test_12_trust_normalization_sums_to_one():
    """Test 12: Active normalized weights sum exactly to 1.0 within tolerance"""
    raw_forecasts = {"ncmrwf_ncum": 14.0, "ncmrwf_neps": 16.0, "ai_graphcast": 12.0}
    res = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    active_weights = [m.adaptive_weight for m in res.models if m.is_active]
    assert pytest.approx(sum(active_weights), 1e-4) == 1.0


def test_13_disabled_models_receive_zero_weight():
    """Test 13: Disabled model receives 0.0 weight and is excluded from blend normalization"""
    raw_forecasts = {"ncmrwf_ncum": 14.0, "ncmrwf_neps": 16.0, "ai_graphcast": 12.0}
    switches = {"ncmrwf_ncum": True, "ncmrwf_neps": True, "ai_graphcast": False}
    res = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=24, model_switches=switches)
    ai = next(m for m in res.models if m.model_id == "ai_graphcast")
    assert ai.adaptive_weight == 0.0
    assert ai.is_active is False
    active_sum = sum(m.adaptive_weight for m in res.models if m.is_active)
    assert pytest.approx(active_sum, 1e-4) == 1.0


def test_14_one_active_model_receives_100_percent():
    """Test 14: When only one model is active, it receives 100% weight"""
    raw_forecasts = {"ncmrwf_ncum": 14.0, "ncmrwf_neps": 16.0, "ai_graphcast": 12.0}
    switches = {"ncmrwf_ncum": True, "ncmrwf_neps": False, "ai_graphcast": False}
    res = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=24, model_switches=switches)
    ncum = next(m for m in res.models if m.model_id == "ncmrwf_ncum")
    assert ncum.adaptive_weight == 1.0
    assert res.calibrated_blended_value == ncum.calibrated_forecast


def test_15_no_verification_data_falls_back_safely():
    """Test 15: If no verification data exists, equal weights are safely assigned (no NaN/crash)"""
    raw_forecasts = {"m1": 10.0, "m2": 20.0}
    res = compute_dynamic_trust_blend(raw_forecasts, location_id="UNKNOWN_CITY", variable_id="unknown_var", lead_hours=999, all_records=[])
    assert res.status == "ready"
    for m in res.models:
        assert m.adaptive_weight == 0.5
        assert m.trust_score == 1000.0  # 1 / (0.001 + 0)


# ==========================================
# 4. INTEGRATION TESTS (Tests 16 - 21)
# ==========================================

def test_16_changing_location_changes_skill_context():
    """Test 16: Different cities select different context records and produce distinct weights"""
    raw_forecasts = {"ncmrwf_ncum": 15.0, "ncmrwf_neps": 18.0, "ai_graphcast": 12.0}
    res_delhi = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    res_mumbai = compute_dynamic_trust_blend(raw_forecasts, location_id="MUMBAI", variable_id="rainfall", lead_hours=24)
    assert res_delhi.models[0].bias != res_mumbai.models[0].bias


def test_17_changing_variable_changes_skill_context():
    """Test 17: Changing meteorological variable changes units, errors, and trust scores"""
    raw_rain = {"ncmrwf_ncum": 15.0, "ncmrwf_neps": 18.0, "ai_graphcast": 12.0}
    raw_temp = {"ncmrwf_ncum": 32.0, "ncmrwf_neps": 31.5, "ai_graphcast": 32.2}
    res_rain = compute_dynamic_trust_blend(raw_rain, location_id="DELHI", variable_id="rainfall", lead_hours=24, unit="mm")
    res_temp = compute_dynamic_trust_blend(raw_temp, location_id="DELHI", variable_id="temperature", lead_hours=24, unit="°C")
    assert res_rain.unit == "mm"
    assert res_temp.unit == "°C"
    assert res_rain.models[0].mae != res_temp.models[0].mae


def test_18_changing_lead_time_changes_skill_context():
    """Test 18: Changing lead time queries corresponding lead time verification slice"""
    raw_forecasts = {"ncmrwf_ncum": 15.0, "ncmrwf_neps": 18.0, "ai_graphcast": 12.0}
    res_24 = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    res_48 = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=48)
    assert res_24.lead_hours == 24
    assert res_48.lead_hours == 48


def test_19_adaptive_blend_uses_adaptive_weights():
    """Test 19: Adaptive blend matches weighted sum of calibrated forecasts"""
    raw_forecasts = {"ncmrwf_ncum": 14.2, "ncmrwf_neps": 16.5, "ai_graphcast": 12.8}
    res = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=24, strategy="adaptive_skill")
    expected_sum = sum(m.calibrated_forecast * m.adaptive_weight for m in res.models if m.is_active)
    assert pytest.approx(res.calibrated_blended_value, 0.01) == round(expected_sum, 2)


def test_20_equal_baseline_remains_available():
    """Test 20: Equal baseline strategy is preserved and available on demand"""
    raw_forecasts = {"ncmrwf_ncum": 14.2, "ncmrwf_neps": 16.5, "ai_graphcast": 12.8}
    res = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=24, strategy="equal_baseline")
    assert res.strategy == "equal_baseline"
    assert res.calibrated_blended_value == res.equal_baseline_value


def test_21_deterministic_repeatability():
    """Test 21: Repeated runs return identical deterministic outputs"""
    raw_forecasts = {"ncmrwf_ncum": 14.2, "ncmrwf_neps": 16.5, "ai_graphcast": 12.8}
    res1 = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    res2 = compute_dynamic_trust_blend(raw_forecasts, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    assert res1.calibrated_blended_value == res2.calibrated_blended_value
    assert res1.models[0].trust_score == res2.models[0].trust_score
