/**
 * Unified Forecast Blending & Dynamic Calibration Engine
 * Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 3
 *
 * Implements:
 * 1. Context-Aware Calibration (Mean Bias Correction)
 * 2. Recent Skill Evaluation (MAE, RMSE, Bias, Exponential Weighted Error)
 * 3. Dynamic Trust-Weighted Blending (Adaptive Recent Skill Strategy)
 * 4. Equal-Weight Baseline Blending (Step 2 Baseline Strategy)
 */

import type { ReplayForecastPoint } from './replayData';
import { MODELS } from './replayData';
import { calibrateForecast } from './calibrationEngine';
import {
  calculateRecentSkill,
  computeDynamicTrustScore,
  generateExplainabilitySummary,
} from './trustEngine';
import type { FullAdaptiveBlendResult, ModelTrustResult } from './trustEngine';

export type BlendingStrategy = 'adaptive_skill' | 'equal_baseline';

export const computeUnifiedBlend = (
  forecasts: ReplayForecastPoint[],
  modelSwitches: Record<string, boolean>,
  strategy: BlendingStrategy = 'adaptive_skill',
  locationName: string = 'New Delhi',
  variableName: string = 'Rainfall'
): FullAdaptiveBlendResult => {
  const unit = forecasts[0]?.unit ?? '';
  const totalModels = MODELS.length;

  // Step 1: Calibrate each forecast and calculate recent skill
  const modelTrusts: ModelTrustResult[] = MODELS.map((m) => {
    const fc = forecasts.find((f) => f.modelId === m.id);
    const rawVal = fc ? fc.value : 0;
    const isActive = modelSwitches[m.id] !== false;
    const locId = fc ? fc.locationId : 'DELHI';
    const varId = fc ? fc.variableId : 'rainfall';
    const leadHours = fc ? fc.leadHours : 24;

    // Calibration
    const calib = calibrateForecast(rawVal, m.id, locId, varId, leadHours, unit);

    // Skill
    const skill = calculateRecentSkill(m.id, locId, varId, leadHours);

    // Trust Score = 1 / (0.001 + MAE)
    const trustScore = isActive ? computeDynamicTrustScore(skill.mae) : 0.0;

    return {
      modelId: m.id,
      modelName: m.name,
      shortName: m.shortName,
      color: m.color,
      rawForecast: rawVal,
      bias: calib.bias,
      calibratedForecast: calib.calibratedForecast,
      calibrationSource: calib.calibrationSource,
      mae: skill.mae,
      rmse: skill.rmse,
      sampleCount: skill.sampleCount,
      trustScore,
      adaptiveWeight: 0.0,
      equalWeight: 0.0,
      isActive,
    };
  });

  const activeModels = modelTrusts.filter((m) => m.isActive);
  const activeCount = activeModels.length;

  // Step 2: Handle Zero Active Models
  if (activeCount === 0) {
    return {
      strategy,
      activeCount: 0,
      totalModels,
      calibratedBlendedValue: null,
      rawBlendedValue: null,
      equalBaselineValue: null,
      unit,
      modelTrusts,
      status: 'no_active_models',
      explanation: 'All forecast models are currently disabled. Enable at least one feed to compute dynamic trust weights.',
      message: 'No active forecast models selected. Enable at least one model in the controls.',
    };
  }

  // Step 3: Compute Normalized Weights
  const totalTrust = activeModels.reduce((acc, m) => acc + m.trustScore, 0);

  modelTrusts.forEach((m) => {
    if (m.isActive) {
      m.equalWeight = Number((1.0 / activeCount).toFixed(4));
      if (totalTrust > 0) {
        m.adaptiveWeight = Number((m.trustScore / totalTrust).toFixed(4));
      } else {
        m.adaptiveWeight = m.equalWeight;
      }
    } else {
      m.equalWeight = 0.0;
      m.adaptiveWeight = 0.0;
    }
  });

  // Numerical precision correction: ensure active adaptive weights sum to 1.000
  const activeAdaptiveSum = modelTrusts.filter((m) => m.isActive).reduce((a, b) => a + b.adaptiveWeight, 0);
  const diff = 1.0 - activeAdaptiveSum;
  if (Math.abs(diff) > 0.00001) {
    const firstActive = modelTrusts.find((m) => m.isActive);
    if (firstActive) {
      firstActive.adaptiveWeight = Number((firstActive.adaptiveWeight + diff).toFixed(4));
    }
  }

  // Step 4: Calculate Blended Results
  const rawBlendedValue = Number(
    (activeModels.reduce((acc, m) => acc + m.rawForecast * (1 / activeCount), 0)).toFixed(2)
  );

  const equalBaselineValue = Number(
    (activeModels.reduce((acc, m) => acc + m.calibratedForecast * m.equalWeight, 0)).toFixed(2)
  );

  const adaptiveValue = Number(
    (activeModels.reduce((acc, m) => acc + m.calibratedForecast * m.adaptiveWeight, 0)).toFixed(2)
  );

  const calibratedBlendedValue = strategy === 'adaptive_skill' ? adaptiveValue : equalBaselineValue;

  const explanation = generateExplainabilitySummary(activeModels, locationName, variableName, unit);

  return {
    strategy,
    activeCount,
    totalModels,
    calibratedBlendedValue,
    rawBlendedValue,
    equalBaselineValue,
    unit,
    modelTrusts,
    status: 'ready',
    explanation,
  };
};
