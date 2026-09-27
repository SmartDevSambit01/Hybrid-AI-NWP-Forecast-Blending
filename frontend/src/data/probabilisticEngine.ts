/**
 * EMOS-Inspired Gaussian Predictive Distribution & Threshold Probability Engine (Frontend)
 * Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 4
 *
 * Implements:
 * 1. Model-level Gaussian uncertainty Y ~ N(mu, sigma) with prediction intervals (50%, 80%, 90%).
 * 2. Probabilistic mixture blend:
 *    - Within-model variance: sum(w_i * sigma_i^2)
 *    - Between-model disagreement variance: sum(w_i * (mu_i - mu_blend)^2)
 *    - Total variance: sum(w_i * [sigma_i^2 + (mu_i - mu_blend)^2])
 * 3. Exact Gaussian threshold exceedance: P(Y > T) = 1 - Phi((T - mu) / sigma).
 * 4. Brier score verification for threshold exceedance.
 */

import { VERIFICATION_DATASET } from './calibrationEngine';
import type { ModelTrustResult } from './trustEngine';

export interface IntervalBounds {
  lower: number;
  upper: number;
}

export interface ModelProbabilisticInfo {
  modelId: string;
  modelName: string;
  shortName: string;
  color: string;
  calibratedMean: number;
  predictiveSigma: number;
  interval50: IntervalBounds;
  interval80: IntervalBounds;
  interval90: IntervalBounds;
  weight: number;
  isActive: boolean;
}

export interface ProbabilisticBlendBundle {
  blendedMean: number | null;
  blendedSigma: number | null;
  withinModelSigma: number | null;
  betweenModelSigma: number | null;
  modelSpread: number | null;
  disagreementLevel: 'Low Disagreement' | 'Moderate Disagreement' | 'High Disagreement' | 'No Active Models';
  interval50: IntervalBounds | null;
  interval80: IntervalBounds | null;
  interval90: IntervalBounds | null;
  models: ModelProbabilisticInfo[];
  activeCount: number;
  status: 'ready' | 'no_active_models';
}

export interface ThresholdExceedanceCard {
  threshold: number;
  unit: string;
  probability: number;
  probabilityPercent: number;
  classification: 'Low' | 'Moderate' | 'High' | 'Very High';
  predictiveMean: number;
  predictiveSigma: number;
}

export interface BrierScoreItem {
  threshold: number;
  unit: string;
  brierScore: number;
  sampleCount: number;
}

const Z_50 = 0.674;
const Z_80 = 1.282;
const Z_90 = 1.645;
const SIGMA_MIN = 0.5;

// Standard normal error function approximation (erf)
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);

  return sign * y;
}

export const calculateModelErrorStd = (
  modelId: string,
  locationId: string,
  variableId: string,
  leadHours: number
): number => {
  const matches = VERIFICATION_DATASET.filter(
    (r) =>
      r.modelId === modelId &&
      (r.locationId.toUpperCase() === locationId.toUpperCase() ||
        r.variableId.toLowerCase() === variableId.toLowerCase()) &&
      r.leadHours === leadHours
  );

  if (matches.length < 2) return SIGMA_MIN;

  const errors = matches.map((r) => r.forecast - r.observed);
  const meanErr = errors.reduce((a, b) => a + b, 0) / errors.length;
  const variance = errors.reduce((acc, e) => acc + (e - meanErr) ** 2, 0) / (errors.length - 1);
  return Number(Math.max(SIGMA_MIN, Math.sqrt(variance)).toFixed(2));
};

export const computeIntervals = (
  mean: number,
  sigma: number,
  variableId: string
): { i50: IntervalBounds; i80: IntervalBounds; i90: IntervalBounds } => {
  const isNonNegative = variableId.toLowerCase() === 'rainfall' || variableId.toLowerCase() === 'wind_speed';
  const bound = (v: number) => (isNonNegative ? Math.max(0, v) : v);

  return {
    i50: {
      lower: Number(bound(mean - Z_50 * sigma).toFixed(2)),
      upper: Number((mean + Z_50 * sigma).toFixed(2)),
    },
    i80: {
      lower: Number(bound(mean - Z_80 * sigma).toFixed(2)),
      upper: Number((mean + Z_80 * sigma).toFixed(2)),
    },
    i90: {
      lower: Number(bound(mean - Z_90 * sigma).toFixed(2)),
      upper: Number((mean + Z_90 * sigma).toFixed(2)),
    },
  };
};

export const classifyDisagreement = (
  spread: number,
  variableId: string
): 'Low Disagreement' | 'Moderate Disagreement' | 'High Disagreement' => {
  const varLower = variableId.toLowerCase();
  if (varLower === 'rainfall') {
    return spread < 1.0 ? 'Low Disagreement' : spread <= 3.0 ? 'Moderate Disagreement' : 'High Disagreement';
  } else if (varLower === 'temperature') {
    return spread < 0.5 ? 'Low Disagreement' : spread <= 1.5 ? 'Moderate Disagreement' : 'High Disagreement';
  } else {
    return spread < 2.0 ? 'Low Disagreement' : spread <= 5.0 ? 'Moderate Disagreement' : 'High Disagreement';
  }
};

export const computeProbabilisticBlendEngine = (
  modelTrusts: ModelTrustResult[],
  locationId: string,
  variableId: string,
  leadHours: number,
  strategy: 'adaptive_skill' | 'equal_baseline'
): ProbabilisticBlendBundle => {
  const activeModels = modelTrusts.filter((m) => m.isActive);
  const activeCount = activeModels.length;

  const modelProbs: ModelProbabilisticInfo[] = modelTrusts.map((m) => {
    const sigma = calculateModelErrorStd(m.modelId, locationId, variableId, leadHours);
    const intervals = computeIntervals(m.calibratedForecast, sigma, variableId);
    const weight = strategy === 'adaptive_skill' ? m.adaptiveWeight : m.equalWeight;

    return {
      modelId: m.modelId,
      modelName: m.modelName,
      shortName: m.shortName,
      color: m.color,
      calibratedMean: m.calibratedForecast,
      predictiveSigma: sigma,
      interval50: intervals.i50,
      interval80: intervals.i80,
      interval90: intervals.i90,
      weight,
      isActive: m.isActive,
    };
  });

  if (activeCount === 0) {
    return {
      blendedMean: null,
      blendedSigma: null,
      withinModelSigma: null,
      betweenModelSigma: null,
      modelSpread: null,
      disagreementLevel: 'No Active Models',
      interval50: null,
      interval80: null,
      interval90: null,
      models: modelProbs,
      activeCount: 0,
      status: 'no_active_models',
    };
  }

  const activeProbs = modelProbs.filter((m) => m.isActive);

  // 1. Predictive Mean
  const blendedMean = Number(
    activeProbs.reduce((acc, m) => acc + m.weight * m.calibratedMean, 0).toFixed(2)
  );

  // 2. Uncertainty Decomposition
  const varWithin = activeProbs.reduce((acc, m) => acc + m.weight * m.predictiveSigma ** 2, 0);
  const varBetween = activeProbs.reduce((acc, m) => acc + m.weight * (m.calibratedMean - blendedMean) ** 2, 0);
  const varTotal = varWithin + varBetween;
  const blendedSigma = Number(Math.sqrt(Math.max(0.0001, varTotal)).toFixed(2));
  const withinModelSigma = Number(Math.sqrt(varWithin).toFixed(2));
  const betweenModelSigma = Number(Math.sqrt(varBetween).toFixed(2));

  // 3. Model Spread
  let modelSpread = 0.0;
  if (activeCount > 1) {
    const meanOfMeans = activeProbs.reduce((acc, m) => acc + m.calibratedMean, 0) / activeCount;
    const spreadVar =
      activeProbs.reduce((acc, m) => acc + (m.calibratedMean - meanOfMeans) ** 2, 0) / (activeCount - 1);
    modelSpread = Number(Math.sqrt(spreadVar).toFixed(2));
  }

  const disagreementLevel = classifyDisagreement(modelSpread, variableId);
  const intervals = computeIntervals(blendedMean, blendedSigma, variableId);

  return {
    blendedMean,
    blendedSigma,
    withinModelSigma,
    betweenModelSigma,
    modelSpread,
    disagreementLevel,
    interval50: intervals.i50,
    interval80: intervals.i80,
    interval90: intervals.i90,
    models: modelProbs,
    activeCount,
    status: 'ready',
  };
};

export const calculateThresholdProbability = (
  mean: number,
  sigma: number,
  threshold: number
): { probability: number; probabilityPercent: number; classification: 'Low' | 'Moderate' | 'High' | 'Very High' } => {
  if (sigma <= 0.0001) {
    const p = mean > threshold ? 1.0 : mean < threshold ? 0.0 : 0.5;
    return {
      probability: p,
      probabilityPercent: p * 100,
      classification: p < 0.2 ? 'Low' : p <= 0.5 ? 'Moderate' : p <= 0.8 ? 'High' : 'Very High',
    };
  }

  const z = (threshold - mean) / (sigma * Math.sqrt(2.0));
  const prob = Number(Math.max(0.0, Math.min(1.0, 0.5 * (1.0 - erf(z)))).toFixed(4));
  const percent = Number((prob * 100).toFixed(1));

  let classification: 'Low' | 'Moderate' | 'High' | 'Very High' = 'Low';
  if (prob < 0.2) classification = 'Low';
  else if (prob <= 0.5) classification = 'Moderate';
  else if (prob <= 0.8) classification = 'High';
  else classification = 'Very High';

  return {
    probability: prob,
    probabilityPercent: percent,
    classification,
  };
};

export const getVariableThresholdPresets = (variableId: string): number[] => {
  const varLower = variableId.toLowerCase();
  if (varLower === 'rainfall') return [10, 25, 50, 100];
  if (varLower === 'temperature') return [35, 40];
  if (varLower === 'wind_speed') return [40, 60, 80];
  return [10, 25, 50];
};

export const computeBrierScores = (
  locationId: string,
  variableId: string,
  leadHours: number,
  predictiveSigma: number,
  unit: string
): BrierScoreItem[] => {
  const presets = getVariableThresholdPresets(variableId);
  const contextRecords = VERIFICATION_DATASET.filter(
    (r) =>
      r.locationId.toUpperCase() === locationId.toUpperCase() &&
      r.variableId.toLowerCase() === variableId.toLowerCase() &&
      r.leadHours === leadHours
  );

  if (contextRecords.length === 0) {
    return presets.map((th) => ({
      threshold: th,
      unit,
      brierScore: 0.0,
      sampleCount: 0,
    }));
  }

  return presets.map((th) => {
    const sqDiffs = contextRecords.map((r) => {
      const prob = calculateThresholdProbability(r.forecast, predictiveSigma, th).probability;
      const event = r.observed > th ? 1.0 : 0.0;
      return (prob - event) ** 2;
    });
    const brier = Number((sqDiffs.reduce((a, b) => a + b, 0) / sqDiffs.length).toFixed(4));

    return {
      threshold: th,
      unit,
      brierScore: brier,
      sampleCount: contextRecords.length,
    };
  });
};
