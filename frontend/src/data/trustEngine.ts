/**
 * Dynamic Trust & Recent Skill Engine (Frontend)
 * Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 3
 *
 * Implements:
 * 1. Continuous Skill Metrics: MAE, RMSE, Bias.
 * 2. Exponentially Weighted Recent Error: E_t = lambda * E_{t-1} + (1 - lambda) * L_t (lambda = 0.8).
 * 3. Dynamic Trust Score: trust_i = 1 / (epsilon + MAE) (epsilon = 0.001).
 * 4. Adaptive Trust-Normalized Weights: w_i = trust_i / sum(trust_j).
 */

import { VERIFICATION_DATASET } from './calibrationEngine';

export interface ModelSkillStats {
  modelId: string;
  mae: number;
  rmse: number;
  bias: number;
  expWeightedMae: number;
  sampleCount: number;
}

export interface ModelTrustResult {
  modelId: string;
  modelName: string;
  shortName: string;
  color: string;
  rawForecast: number;
  bias: number;
  calibratedForecast: number;
  calibrationSource: string;
  mae: number;
  rmse: number;
  sampleCount: number;
  trustScore: number;
  adaptiveWeight: number;
  equalWeight: number;
  isActive: boolean;
}

export interface FullAdaptiveBlendResult {
  strategy: 'adaptive_skill' | 'equal_baseline';
  activeCount: number;
  totalModels: number;
  calibratedBlendedValue: number | null;
  rawBlendedValue: number | null;
  equalBaselineValue: number | null;
  unit: string;
  modelTrusts: ModelTrustResult[];
  status: 'ready' | 'no_active_models';
  explanation: string;
  message?: string;
}

export const calculateRecentSkill = (
  modelId: string,
  locationId: string,
  variableId: string,
  leadHours: number,
  recentWindow: number = 10,
  decayLambda: number = 0.8
): ModelSkillStats => {
  // Filter context records
  const matches = VERIFICATION_DATASET.filter(
    (r) =>
      r.modelId === modelId &&
      (r.locationId.toUpperCase() === locationId.toUpperCase() ||
        r.variableId.toLowerCase() === variableId.toLowerCase()) &&
      r.leadHours === leadHours
  ).slice(0, recentWindow);

  if (matches.length === 0) {
    return {
      modelId,
      mae: 0.0,
      rmse: 0.0,
      bias: 0.0,
      expWeightedMae: 0.0,
      sampleCount: 0,
    };
  }

  const n = matches.length;
  const errors = matches.map((r) => r.forecast - r.observed);
  const absErrors = errors.map((e) => Math.abs(e));
  const sqErrors = errors.map((e) => e * e);

  const mae = Number((absErrors.reduce((a, b) => a + b, 0) / n).toFixed(3));
  const rmse = Number((Math.sqrt(sqErrors.reduce((a, b) => a + b, 0) / n)).toFixed(3));
  const bias = Number((errors.reduce((a, b) => a + b, 0) / n).toFixed(3));

  // Exponentially weighted error
  let ewError = absErrors[0];
  for (let i = 1; i < absErrors.length; i++) {
    ewError = decayLambda * ewError + (1.0 - decayLambda) * absErrors[i];
  }
  const expWeightedMae = Number(ewError.toFixed(3));

  return {
    modelId,
    mae,
    rmse,
    bias,
    expWeightedMae,
    sampleCount: n,
  };
};

export const computeDynamicTrustScore = (mae: number, epsilon: number = 0.001): number => {
  return Number((1.0 / (epsilon + Math.max(0, mae))).toFixed(4));
};

export const generateExplainabilitySummary = (
  activeModels: ModelTrustResult[],
  locationName: string,
  variableName: string,
  unit: string
): string => {
  if (activeModels.length === 0) {
    return 'All forecast models are currently disabled. Enable at least one feed to compute dynamic trust weights.';
  }
  if (activeModels.length === 1) {
    return `Single active model (${activeModels[0].shortName}) receives 100% weight as solitary operational feed.`;
  }

  const bestModel = activeModels.reduce((prev, curr) => (curr.mae < prev.mae ? curr : prev), activeModels[0]);
  const worstModel = activeModels.reduce((prev, curr) => (curr.mae > prev.mae ? curr : prev), activeModels[0]);

  if (bestModel.mae < worstModel.mae) {
    return `${bestModel.shortName} receives the highest trust weight (${(bestModel.adaptiveWeight * 100).toFixed(1)}%) because its recent replay MAE is lowest (${bestModel.mae.toFixed(2)} ${unit} vs ${worstModel.mae.toFixed(2)} ${unit} for ${worstModel.shortName}) in this ${locationName} ${variableName} context.`;
  }
  return 'Active models exhibit comparable recent replay error; adaptive trust weights remain uniformly balanced.';
};
