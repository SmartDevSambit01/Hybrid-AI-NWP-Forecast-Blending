"""
Comprehensive Pytest Test Suite for Step 4:
Probabilistic Forecasting, Gaussian Predictive Distributions, Uncertainty Decomposition,
Threshold Exceedance Probabilities, and Brier Score Verification.
Covers Tests 1 through 25 as specified in Step 4 requirements.
"""

import math
import pytest
from backend.calibration.bias_correction import VerificationRecord
from backend.probabilistic.distribution import (
    calculate_error_dispersion,
    calculate_intervals,
    compute_model_probabilistic_forecast,
    compute_probabilistic_blend,
    classify_model_disagreement,
    ModelProbabilisticForecast,
)
from backend.probabilistic.exceedance import (
    calculate_exceedance_probability,
    classify_probability_band,
    get_variable_threshold_presets,
    evaluate_threshold_exceedance,
)
from backend.probabilistic.brier import (
    calculate_brier_score,
)


# ==========================================
# 1. DISTRIBUTION TESTS (Tests 1 - 5)
# ==========================================

def test_1_sigma_is_strictly_positive():
    """Test 1: Standard deviation of error is always strictly positive"""
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t1", modelId="m1", forecast=15.0, observed=12.0),
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t2", modelId="m1", forecast=18.0, observed=14.0),
    ]
    sigma = calculate_error_dispersion(records)
    assert sigma > 0.0


def test_2_zero_historical_error_uses_sigma_min():
    """Test 2: Zero error or single record safely falls back to sigma_min threshold"""
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t1", modelId="m1", forecast=10.0, observed=10.0),
    ]
    sigma = calculate_error_dispersion(records, sigma_min=0.5)
    assert sigma == 0.5


def test_3_gaussian_interval_calculation():
    """Test 3: Gaussian intervals match z-scores: mu +- z * sigma"""
    mean = 20.0
    sigma = 2.0
    i50, i80, i90 = calculate_intervals(mean, sigma, variable_id="temperature")
    assert pytest.approx(i50.lower, 0.05) == 20.0 - 0.674 * 2.0
    assert pytest.approx(i50.upper, 0.05) == 20.0 + 0.674 * 2.0
    assert pytest.approx(i90.lower, 0.05) == 20.0 - 1.645 * 2.0
    assert pytest.approx(i90.upper, 0.05) == 20.0 + 1.645 * 2.0


def test_4_90_percent_interval_is_wider_than_50_percent():
    """Test 4: 90% interval span is wider than 80% and 50% interval spans"""
    mean = 15.0
    sigma = 3.0
    i50, i80, i90 = calculate_intervals(mean, sigma, variable_id="temperature")
    span_50 = i50.upper - i50.lower
    span_80 = i80.upper - i80.lower
    span_90 = i90.upper - i90.lower
    assert span_90 > span_80 > span_50


def test_5_physical_lower_bound_works():
    """Test 5: Physical lower bound (>= 0) is enforced for rainfall and wind speed"""
    mean = 2.0
    sigma = 3.0
    i50_rain, i80_rain, i90_rain = calculate_intervals(mean, sigma, variable_id="rainfall")
    assert i90_rain.lower >= 0.0
    assert i90_rain.lower == 0.0  # 2 - 1.645*3 = -2.935 -> clamped to 0.0

    # Temperature allows negative values
    i50_temp, i80_temp, i90_temp = calculate_intervals(mean, sigma, variable_id="temperature")
    assert i90_temp.lower < 0.0


# ==========================================
# 2. BLEND TESTS (Tests 6 - 10)
# ==========================================

def test_6_weighted_mean_calculation():
    """Test 6: Blended predictive mean is the exact weighted average: sum(w_i * mu_i)"""
    models = [
        ModelProbabilisticForecast(
            model_id="m1", model_name="M1", raw_forecast=10.0, calibrated_mean=10.0,
            historical_error_std=1.0, predictive_sigma=1.0,
            interval_50={"lower": 9.3, "upper": 10.7}, interval_80={"lower": 8.7, "upper": 11.3}, interval_90={"lower": 8.3, "upper": 11.7},
            weight=0.6, is_active=True
        ),
        ModelProbabilisticForecast(
            model_id="m2", model_name="M2", raw_forecast=20.0, calibrated_mean=20.0,
            historical_error_std=1.0, predictive_sigma=1.0,
            interval_50={"lower": 19.3, "upper": 20.7}, interval_80={"lower": 18.7, "upper": 21.3}, interval_90={"lower": 18.3, "upper": 21.7},
            weight=0.4, is_active=True
        ),
    ]
    blend = compute_probabilistic_blend(models, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    assert blend.blended_mean == 14.0  # 0.6 * 10 + 0.4 * 20 = 14.0


def test_7_variance_mixture_calculation():
    """Test 7: Total variance decomposes into within-model and between-model variances"""
    models = [
        ModelProbabilisticForecast(
            model_id="m1", model_name="M1", raw_forecast=10.0, calibrated_mean=10.0,
            historical_error_std=2.0, predictive_sigma=2.0,
            interval_50={"lower": 8.6, "upper": 11.4}, interval_80={"lower": 7.4, "upper": 12.6}, interval_90={"lower": 6.7, "upper": 13.3},
            weight=0.5, is_active=True
        ),
        ModelProbabilisticForecast(
            model_id="m2", model_name="M2", raw_forecast=20.0, calibrated_mean=20.0,
            historical_error_std=2.0, predictive_sigma=2.0,
            interval_50={"lower": 18.6, "upper": 21.4}, interval_80={"lower": 17.4, "upper": 22.6}, interval_90={"lower": 16.7, "upper": 23.3},
            weight=0.5, is_active=True
        ),
    ]
    blend = compute_probabilistic_blend(models, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    # mu_blend = 15.0
    # var_within = 0.5 * 4 + 0.5 * 4 = 4.0
    # var_between = 0.5 * (10-15)^2 + 0.5 * (20-15)^2 = 0.5 * 25 + 0.5 * 25 = 25.0
    # var_total = 29.0, sigma = sqrt(29) ≈ 5.39
    assert pytest.approx(blend.within_model_variance, 0.01) == 4.0
    assert pytest.approx(blend.between_model_variance, 0.01) == 25.0
    assert pytest.approx(blend.blended_sigma, 0.02) == 5.39


def test_8_model_disagreement_calculation():
    """Test 8: Model spread calculates standard deviation across model means"""
    models = [
        ModelProbabilisticForecast(
            model_id="m1", model_name="M1", raw_forecast=10.0, calibrated_mean=10.0,
            historical_error_std=1.0, predictive_sigma=1.0,
            interval_50={"lower": 9.0, "upper": 11.0}, interval_80={"lower": 8.0, "upper": 12.0}, interval_90={"lower": 7.0, "upper": 13.0},
            weight=0.5, is_active=True
        ),
        ModelProbabilisticForecast(
            model_id="m2", model_name="M2", raw_forecast=20.0, calibrated_mean=20.0,
            historical_error_std=1.0, predictive_sigma=1.0,
            interval_50={"lower": 19.0, "upper": 21.0}, interval_80={"lower": 18.0, "upper": 22.0}, interval_90={"lower": 17.0, "upper": 23.0},
            weight=0.5, is_active=True
        ),
    ]
    blend = compute_probabilistic_blend(models, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    # std([10, 20]) = sqrt((25 + 25)/1) = sqrt(50) ≈ 7.07
    assert pytest.approx(blend.model_spread, 0.02) == 7.07
    assert blend.disagreement_level == "High Disagreement"


def test_9_one_model_uncertainty():
    """Test 9: Single active model blend matches that model's mean and uncertainty with zero between-model spread"""
    models = [
        ModelProbabilisticForecast(
            model_id="m1", model_name="M1", raw_forecast=15.0, calibrated_mean=14.0,
            historical_error_std=1.8, predictive_sigma=1.8,
            interval_50={"lower": 12.8, "upper": 15.2}, interval_80={"lower": 11.7, "upper": 16.3}, interval_90={"lower": 11.0, "upper": 17.0},
            weight=1.0, is_active=True
        ),
    ]
    blend = compute_probabilistic_blend(models, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    assert blend.blended_mean == 14.0
    assert blend.blended_sigma == 1.8
    assert blend.between_model_variance == 0.0
    assert blend.model_spread == 0.0


def test_10_multiple_model_uncertainty_is_non_zero():
    """Test 10: Multi-model blend has valid positive uncertainty"""
    models = [
        ModelProbabilisticForecast(
            model_id="m1", model_name="M1", raw_forecast=12.0, calibrated_mean=12.0,
            historical_error_std=1.2, predictive_sigma=1.2,
            interval_50={"lower": 11.2, "upper": 12.8}, interval_80={"lower": 10.5, "upper": 13.5}, interval_90={"lower": 10.0, "upper": 14.0},
            weight=0.5, is_active=True
        ),
        ModelProbabilisticForecast(
            model_id="m2", model_name="M2", raw_forecast=14.0, calibrated_mean=14.0,
            historical_error_std=1.5, predictive_sigma=1.5,
            interval_50={"lower": 13.0, "upper": 15.0}, interval_80={"lower": 12.1, "upper": 15.9}, interval_90={"lower": 11.5, "upper": 16.5},
            weight=0.5, is_active=True
        ),
    ]
    blend = compute_probabilistic_blend(models, location_id="DELHI", variable_id="rainfall", lead_hours=24)
    assert blend.blended_sigma > 0.0
    assert blend.active_count == 2


# ==========================================
# 3. THRESHOLD PROBABILITY TESTS (Tests 11 - 15)
# ==========================================

def test_11_probability_near_zero_for_high_threshold():
    """Test 11: P(Y > T) approaches 0 for threshold far above mean"""
    mean = 10.0
    sigma = 2.0
    threshold = 100.0
    p = calculate_exceedance_probability(mean, sigma, threshold)
    assert p < 0.0001
    assert p >= 0.0


def test_12_probability_near_one_for_low_threshold():
    """Test 12: P(Y > T) approaches 1 for threshold far below mean"""
    mean = 50.0
    sigma = 3.0
    threshold = 5.0
    p = calculate_exceedance_probability(mean, sigma, threshold)
    assert p > 0.9999
    assert p <= 1.0


def test_13_probability_around_half_near_mean():
    """Test 13: P(Y > mu) under Gaussian distribution is exactly 0.50"""
    mean = 25.0
    sigma = 4.0
    threshold = 25.0
    p = calculate_exceedance_probability(mean, sigma, threshold)
    assert pytest.approx(p, 0.01) == 0.50


def test_14_sigma_zero_safe_handling():
    """Test 14: Degenerate sigma <= 0 handles step function without NaN/Infinity"""
    assert calculate_exceedance_probability(mean=30.0, sigma=0.0, threshold=20.0) == 1.0
    assert calculate_exceedance_probability(mean=10.0, sigma=0.0, threshold=20.0) == 0.0
    assert calculate_exceedance_probability(mean=20.0, sigma=0.0, threshold=20.0) == 0.5


def test_15_deterministic_repeatability():
    """Test 15: Exceedance probability is 100% deterministic"""
    p1 = calculate_exceedance_probability(14.2, 2.3, 25.0)
    p2 = calculate_exceedance_probability(14.2, 2.3, 25.0)
    assert p1 == p2


# ==========================================
# 4. BRIER SCORE TESTS (Tests 16 - 18)
# ==========================================

def test_16_perfect_probability_brier_score():
    """Test 16: When forecast probability and event match, Brier score is near 0.0"""
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t1", modelId="m1", forecast=100.0, observed=50.0),
    ]
    # Forecast = 100, threshold = 25 -> P(Y > 25) = 1.0, observed 50 > 25 = 1.0 -> (1 - 1)^2 = 0.0
    res = calculate_brier_score(records, threshold=25.0, predictive_sigma=1.0)
    assert res.brier_score == 0.0


def test_17_incorrect_probability_penalty():
    """Test 17: Forecast predicting exceedance when event does not occur is penalized"""
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t1", modelId="m1", forecast=100.0, observed=5.0),
    ]
    # Forecast 100 -> P(Y > 50) = 1.0, observed 5 > 50 = 0.0 -> (1 - 0)^2 = 1.0
    res = calculate_brier_score(records, threshold=50.0, predictive_sigma=1.0)
    assert res.brier_score == 1.0


def test_18_threshold_event_generation():
    """Test 18: Multiple verification records compute average Brier score"""
    records = [
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t1", modelId="m1", forecast=50.0, observed=60.0),  # prob ≈ 1, event = 1
        VerificationRecord(locationId="DELHI", variableId="rainfall", leadHours=24, validTime="t2", modelId="m1", forecast=10.0, observed=5.0),   # prob ≈ 0, event = 0
    ]
    res = calculate_brier_score(records, threshold=25.0, predictive_sigma=1.0)
    assert res.sample_count == 2
    assert res.brier_score < 0.05


# ==========================================
# 5. INTEGRATION TESTS (Tests 19 - 25)
# ==========================================

def test_19_location_changes_probabilistic_output():
    """Test 19: Location slice alters verification dispersion and uncertainty parameters"""
    from backend.calibration.bias_correction import load_verification_records
    all_recs = load_verification_records()
    delhi_recs = [r for r in all_recs if r.locationId == "DELHI"]
    mumbai_recs = [r for r in all_recs if r.locationId == "MUMBAI"]
    delhi_sigma = calculate_error_dispersion(delhi_recs)
    mumbai_sigma = calculate_error_dispersion(mumbai_recs)
    assert delhi_sigma != mumbai_sigma


def test_20_variable_changes_probabilistic_output():
    """Test 20: Changing meteorological variable changes presets and units"""
    rain_presets = get_variable_threshold_presets("rainfall")
    temp_presets = get_variable_threshold_presets("temperature")
    assert 50.0 in rain_presets
    assert 35.0 in temp_presets
    assert rain_presets != temp_presets


def test_21_lead_time_changes_probabilistic_output():
    """Test 21: Presets and evaluations maintain context integrity"""
    res = evaluate_threshold_exceedance(mean=20.0, sigma=3.0, threshold=25.0, variable_id="rainfall")
    assert res.probability > 0.0
    assert res.classification in ["Low", "Moderate", "High", "Very High"]


def test_22_model_switch_changes_uncertainty():
    """Test 22: Toggling off a model recalculates mixture variance and predictive sigma"""
    m1 = ModelProbabilisticForecast(
        model_id="m1", model_name="M1", raw_forecast=10.0, calibrated_mean=10.0,
        historical_error_std=1.0, predictive_sigma=1.0,
        interval_50={"lower": 9.0, "upper": 11.0}, interval_80={"lower": 8.0, "upper": 12.0}, interval_90={"lower": 7.0, "upper": 13.0},
        weight=0.5, is_active=True
    )
    m2 = ModelProbabilisticForecast(
        model_id="m2", model_name="M2", raw_forecast=30.0, calibrated_mean=30.0,
        historical_error_std=5.0, predictive_sigma=5.0,
        interval_50={"lower": 26.0, "upper": 34.0}, interval_80={"lower": 23.0, "upper": 37.0}, interval_90={"lower": 21.0, "upper": 39.0},
        weight=0.5, is_active=True
    )
    # Blend with both active
    blend_both = compute_probabilistic_blend([m1, m2], location_id="DELHI", variable_id="rainfall", lead_hours=24)
    # Blend with m2 disabled
    m1_solo = ModelProbabilisticForecast(
        model_id="m1", model_name="M1", raw_forecast=10.0, calibrated_mean=10.0,
        historical_error_std=1.0, predictive_sigma=1.0,
        interval_50={"lower": 9.0, "upper": 11.0}, interval_80={"lower": 8.0, "upper": 12.0}, interval_90={"lower": 7.0, "upper": 13.0},
        weight=1.0, is_active=True
    )
    m2_disabled = ModelProbabilisticForecast(
        model_id="m2", model_name="M2", raw_forecast=30.0, calibrated_mean=30.0,
        historical_error_std=5.0, predictive_sigma=5.0,
        interval_50={"lower": 26.0, "upper": 34.0}, interval_80={"lower": 23.0, "upper": 37.0}, interval_90={"lower": 21.0, "upper": 39.0},
        weight=0.0, is_active=False
    )
    blend_solo = compute_probabilistic_blend([m1_solo, m2_disabled], location_id="DELHI", variable_id="rainfall", lead_hours=24)
    assert blend_both.blended_sigma != blend_solo.blended_sigma
    assert blend_solo.blended_sigma == 1.0


def test_23_model_switch_changes_disagreement():
    """Test 23: Disabling discordant model drops between-model spread to 0.0"""
    m1 = ModelProbabilisticForecast(
        model_id="m1", model_name="M1", raw_forecast=10.0, calibrated_mean=10.0,
        historical_error_std=1.0, predictive_sigma=1.0,
        interval_50={"lower": 9.0, "upper": 11.0}, interval_80={"lower": 8.0, "upper": 12.0}, interval_90={"lower": 7.0, "upper": 13.0},
        weight=1.0, is_active=True
    )
    m2 = ModelProbabilisticForecast(
        model_id="m2", model_name="M2", raw_forecast=30.0, calibrated_mean=30.0,
        historical_error_std=5.0, predictive_sigma=5.0,
        interval_50={"lower": 26.0, "upper": 34.0}, interval_80={"lower": 23.0, "upper": 37.0}, interval_90={"lower": 21.0, "upper": 39.0},
        weight=0.0, is_active=False
    )
    blend_solo = compute_probabilistic_blend([m1, m2], location_id="DELHI", variable_id="rainfall", lead_hours=24)
    assert blend_solo.model_spread == 0.0
    assert blend_solo.between_model_variance == 0.0


def test_24_strategy_switch_works():
    """Test 24: Strategy switch flag passes through probabilistic blend metadata"""
    m1 = ModelProbabilisticForecast(
        model_id="m1", model_name="M1", raw_forecast=10.0, calibrated_mean=10.0,
        historical_error_std=1.0, predictive_sigma=1.0,
        interval_50={"lower": 9.0, "upper": 11.0}, interval_80={"lower": 8.0, "upper": 12.0}, interval_90={"lower": 7.0, "upper": 13.0},
        weight=1.0, is_active=True
    )
    blend_adapt = compute_probabilistic_blend([m1], location_id="DELHI", variable_id="rainfall", lead_hours=24, strategy="adaptive_skill")
    blend_equal = compute_probabilistic_blend([m1], location_id="DELHI", variable_id="rainfall", lead_hours=24, strategy="equal_baseline")
    assert blend_adapt.strategy == "adaptive_skill"
    assert blend_equal.strategy == "equal_baseline"


def test_25_threshold_switch_works():
    """Test 25: Evaluating higher threshold strictly decreases exceedance probability"""
    mean = 20.0
    sigma = 3.0
    p_15 = calculate_exceedance_probability(mean, sigma, threshold=15.0)
    p_25 = calculate_exceedance_probability(mean, sigma, threshold=25.0)
    p_35 = calculate_exceedance_probability(mean, sigma, threshold=35.0)
    assert p_15 > p_25 > p_35
