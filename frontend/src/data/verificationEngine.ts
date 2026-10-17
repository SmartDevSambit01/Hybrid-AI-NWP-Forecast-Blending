/**
 * Step 5 Verification Engine (Frontend)
 * Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 5
 *
 * Implements client-side:
 * 1. Gaussian closed-form CRPS: sigma * { z*(2*Phi(z)-1) + 2*phi(z) - 1/sqrt(pi) }
 * 2. Reliability diagram bins (10 bins, forecast probability vs observed frequency)
 * 3. Coverage diagnostics (50%, 80%, 90% nominal vs observed coverage + mean width)
 * 4. Exponential rolling MAE, RMSE, Bias, CRPS (lambda = 0.8)
 * 5. Trust change explanations comparing rolling-skill weights to equal-weight
 *
 * All metrics derive from the DEMO/REPLAY verification dataset.
 * No random data, no fabricated claims.
 */
import { VERIFICATION_DATASET } from './calibrationEngine';

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────
const DECAY_LAMBDA = 0.8;
const EPSILON = 0.001;
const SIGMA_MIN = 0.5;

const Z_SCORES: Record<number, number> = {
  0.50: 0.674,
  0.80: 1.282,
  0.90: 1.645,
};

const MODEL_NAMES: Record<string, string> = {
  ncmrwf_ncum: 'NCMRWF NCUM',
  ncmrwf_neps: 'NCMRWF NEPS',
  ai_graphcast: 'AI Weather Model',
};

// ──────────────────────────────────────────────────────────────
// Standard Normal helpers
// ──────────────────────────────────────────────────────────────

/** Standard normal PDF */
function phi(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2.0 * Math.PI);
}

/** Standard normal CDF — Abramowitz & Stegun approximation (max error ≈ 7.5e-8) */
function Phi(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absZ * absZ);
  return 0.5 * (1.0 + sign * y);
}

// ──────────────────────────────────────────────────────────────
// CRPS
// ──────────────────────────────────────────────────────────────

/**
 * Gaussian closed-form CRPS for a single observation.
 * CRPS(N(mu, sigma), y) = sigma * { z*(2*Phi(z)-1) + 2*phi(z) - 1/sqrt(pi) }
 * where z = (y - mu) / sigma
 */
export function crpsGaussianSingle(mu: number, sigma: number, y: number): number {
  if (sigma <= 0) return Math.abs(y - mu);
  const z = (y - mu) / sigma;
  const term1 = z * (2.0 * Phi(z) - 1.0);
  const term2 = 2.0 * phi(z);
  const term3 = 1.0 / Math.sqrt(Math.PI);
  return Math.max(0, sigma * (term1 + term2 - term3));
}

export interface CRPSModelResult {
  modelId: string;
  modelName: string;
  crpsMean: number;
  sampleCount: number;
  sigmaUsed: number;
  note: string;
  dataStatus: 'demo_replay';
}

/**
 * Computes mean Gaussian CRPS for each model given context-filtered records
 * and per-model historical error sigma.
 */
export function computeCRPSForContext(
  locationId: string,
  variableId: string,
  leadHours: number,
  modelSigmas: Record<string, number>
): CRPSModelResult[] {
  const modelIds = ['ncmrwf_ncum', 'ncmrwf_neps', 'ai_graphcast'];

  return modelIds.map((mid) => {
    const records = VERIFICATION_DATASET.filter(
      (r) =>
        r.modelId === mid &&
        r.locationId.toUpperCase() === locationId.toUpperCase() &&
        r.variableId.toLowerCase() === variableId.toLowerCase() &&
        r.leadHours === leadHours
    );

    const sigma = Math.max(SIGMA_MIN, modelSigmas[mid] ?? SIGMA_MIN);

    if (records.length === 0) {
      return {
        modelId: mid,
        modelName: MODEL_NAMES[mid] ?? mid,
        crpsMean: 0,
        sampleCount: 0,
        sigmaUsed: sigma,
        note: 'no_records_available',
        dataStatus: 'demo_replay' as const,
      };
    }

    const vals = records.map((r) => crpsGaussianSingle(r.forecast, sigma, r.observed));
    const crpsMean = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4));
    const note = records.length < 5 ? `small_sample_n${records.length}` : '';

    return {
      modelId: mid,
      modelName: MODEL_NAMES[mid] ?? mid,
      crpsMean,
      sampleCount: records.length,
      sigmaUsed: sigma,
      note,
      dataStatus: 'demo_replay' as const,
    };
  });
}

// ──────────────────────────────────────────────────────────────
// Reliability Diagram
// ──────────────────────────────────────────────────────────────

export interface ReliabilityBin {
  binLower: number;
  binUpper: number;
  binCenter: number;
  meanForecastProb: number;
  observedFrequency: number;
  sampleCount: number;
}

export interface ReliabilityDiagramData {
  threshold: number;
  unit: string;
  bins: ReliabilityBin[];
  totalSamples: number;
  note: string;
  dataStatus: 'demo_replay';
}

/** P(forecast > threshold) = 1 - Phi((threshold - mu) / sigma) */
function exceedanceProb(mu: number, sigma: number, threshold: number): number {
  if (sigma <= 0) return mu > threshold ? 1.0 : 0.0;
  const z = (threshold - mu) / sigma;
  return Math.max(0, Math.min(1, 1.0 - Phi(z)));
}

/**
 * Computes reliability diagram (10 equal-width bins) for a given threshold.
 * Uses all context records (all models combined) for the binning.
 */
export function computeReliabilityDiagram(
  locationId: string,
  variableId: string,
  leadHours: number,
  threshold: number,
  predictiveSigma: number,
  unit: string
): ReliabilityDiagramData {
  const records = VERIFICATION_DATASET.filter(
    (r) =>
      r.locationId.toUpperCase() === locationId.toUpperCase() &&
      r.variableId.toLowerCase() === variableId.toLowerCase() &&
      r.leadHours === leadHours
  );

  const sigma = Math.max(SIGMA_MIN, predictiveSigma);
  const pairs = records.map((r) => ({
    prob: exceedanceProb(r.forecast, sigma, threshold),
    event: r.observed > threshold ? 1.0 : 0.0,
  }));

  const N_BINS = 10;
  const binWidth = 1.0 / N_BINS;
  const bins: ReliabilityBin[] = [];

  for (let i = 0; i < N_BINS; i++) {
    const lower = i * binWidth;
    const upper = (i + 1) * binWidth;
    const center = Number(((lower + upper) / 2).toFixed(3));

    const inBin = pairs.filter(
      ({ prob }) => (prob >= lower && prob < upper) || (i === N_BINS - 1 && prob === 1.0)
    );

    const count = inBin.length;
    const meanForecastProb =
      count > 0 ? Number((inBin.reduce((s, p) => s + p.prob, 0) / count).toFixed(4)) : center;
    const observedFrequency =
      count > 0 ? Number((inBin.reduce((s, p) => s + p.event, 0) / count).toFixed(4)) : 0;

    bins.push({
      binLower: Number(lower.toFixed(3)),
      binUpper: Number(upper.toFixed(3)),
      binCenter: center,
      meanForecastProb,
      observedFrequency,
      sampleCount: count,
    });
  }

  const note = records.length < 10 ? `small_sample_n${records.length}_reliability_may_be_unstable` : '';

  return {
    threshold,
    unit,
    bins,
    totalSamples: records.length,
    note,
    dataStatus: 'demo_replay',
  };
}

// ──────────────────────────────────────────────────────────────
// Coverage Diagnostics (Calibration of Intervals)
// ──────────────────────────────────────────────────────────────

export interface CoverageDiagnostic {
  nominalCoverage: number;        // 0.50, 0.80, or 0.90
  observedCoverage: number;       // fraction of obs within interval
  sampleCount: number;
  meanIntervalWidth: number;      // sharpness for this level
  dataStatus: 'demo_replay';
}

export interface CoverageSummary {
  modelId: string;
  modelName: string;
  variableId: string;
  leadHours: number;
  coverages: CoverageDiagnostic[];
  note: string;
  dataStatus: 'demo_replay';
}

export function computeCoverageForModel(
  modelId: string,
  locationId: string,
  variableId: string,
  leadHours: number,
  predictiveSigma: number
): CoverageSummary {
  const records = VERIFICATION_DATASET.filter(
    (r) =>
      r.modelId === modelId &&
      r.locationId.toUpperCase() === locationId.toUpperCase() &&
      r.variableId.toLowerCase() === variableId.toLowerCase() &&
      r.leadHours === leadHours
  );

  const sigma = Math.max(SIGMA_MIN, predictiveSigma);
  const isNonNeg = variableId.toLowerCase() === 'rainfall' || variableId.toLowerCase() === 'wind_speed';
  const coverages: CoverageDiagnostic[] = [];

  for (const [nomStr, z] of Object.entries(Z_SCORES)) {
    const nominal = Number(nomStr);
    const widths: number[] = [];
    let hits = 0;
    const n = records.length;

    if (n === 0) {
      coverages.push({
        nominalCoverage: nominal,
        observedCoverage: 0,
        sampleCount: 0,
        meanIntervalWidth: 0,
        dataStatus: 'demo_replay',
      });
      continue;
    }

    for (const r of records) {
      let lower = r.forecast - z * sigma;
      const upper = r.forecast + z * sigma;
      if (isNonNeg) lower = Math.max(0, lower);
      widths.push(upper - lower);
      if (r.observed >= lower && r.observed <= upper) hits++;
    }

    coverages.push({
      nominalCoverage: nominal,
      observedCoverage: Number((hits / n).toFixed(4)),
      sampleCount: n,
      meanIntervalWidth: Number((widths.reduce((a, b) => a + b, 0) / n).toFixed(3)),
      dataStatus: 'demo_replay',
    });
  }

  const note = records.length < 5 ? `small_sample_n${records.length}_interpret_with_caution` : '';
  return {
    modelId,
    modelName: MODEL_NAMES[modelId] ?? modelId,
    variableId,
    leadHours,
    coverages,
    note,
    dataStatus: 'demo_replay',
  };
}

// ──────────────────────────────────────────────────────────────
// Exponential Rolling Skill
// ──────────────────────────────────────────────────────────────

export interface RollingStep {
  stepIndex: number;
  forecast: number;
  observed: number;
  absError: number;
  crpsValue: number;
  rollingMae: number;
  rollingRmse: number;
  rollingBias: number;
  rollingCrps: number;
}

export interface RollingSkillResult {
  modelId: string;
  modelName: string;
  lambdaDecay: number;
  finalRollingMae: number;
  finalRollingRmse: number;
  finalRollingBias: number;
  finalRollingCrps: number;
  trustScore: number;
  sampleCount: number;
  series: RollingStep[];
  note: string;
  dataStatus: 'demo_replay';
}

export function computeRollingSkillForModel(
  modelId: string,
  locationId: string,
  variableId: string,
  leadHours: number,
  predictiveSigma: number
): RollingSkillResult {
  const records = VERIFICATION_DATASET.filter(
    (r) =>
      r.modelId === modelId &&
      r.locationId.toUpperCase() === locationId.toUpperCase() &&
      r.variableId.toLowerCase() === variableId.toLowerCase() &&
      r.leadHours === leadHours
  );

  const sigma = Math.max(SIGMA_MIN, predictiveSigma);

  if (records.length === 0) {
    return {
      modelId,
      modelName: MODEL_NAMES[modelId] ?? modelId,
      lambdaDecay: DECAY_LAMBDA,
      finalRollingMae: 0,
      finalRollingRmse: 0,
      finalRollingBias: 0,
      finalRollingCrps: 0,
      trustScore: Number((1.0 / EPSILON).toFixed(4)),
      sampleCount: 0,
      series: [],
      note: 'no_records',
      dataStatus: 'demo_replay',
    };
  }

  const series: RollingStep[] = [];
  let rollMae = 0, rollRmse = 0, rollBias = 0, rollCrps = 0;

  records.forEach((r, i) => {
    const err = r.forecast - r.observed;
    const absErr = Math.abs(err);
    const sqErr = err * err;
    const crps = crpsGaussianSingle(r.forecast, sigma, r.observed);

    if (i === 0) {
      rollMae = absErr;
      rollRmse = Math.sqrt(sqErr);
      rollBias = err;
      rollCrps = crps;
    } else {
      rollMae = DECAY_LAMBDA * rollMae + (1 - DECAY_LAMBDA) * absErr;
      rollRmse = DECAY_LAMBDA * rollRmse + (1 - DECAY_LAMBDA) * Math.sqrt(sqErr);
      rollBias = DECAY_LAMBDA * rollBias + (1 - DECAY_LAMBDA) * err;
      rollCrps = DECAY_LAMBDA * rollCrps + (1 - DECAY_LAMBDA) * crps;
    }

    series.push({
      stepIndex: i + 1,
      forecast: Number(r.forecast.toFixed(3)),
      observed: Number(r.observed.toFixed(3)),
      absError: Number(absErr.toFixed(4)),
      crpsValue: Number(crps.toFixed(6)),
      rollingMae: Number(rollMae.toFixed(4)),
      rollingRmse: Number(rollRmse.toFixed(4)),
      rollingBias: Number(rollBias.toFixed(4)),
      rollingCrps: Number(rollCrps.toFixed(6)),
    });
  });

  const trust = Number((1.0 / (EPSILON + Math.max(0, rollMae))).toFixed(4));
  const note = records.length < 5 ? `small_sample_n${records.length}_rolling_metrics_stabilize_with_more_data` : '';

  return {
    modelId,
    modelName: MODEL_NAMES[modelId] ?? modelId,
    lambdaDecay: DECAY_LAMBDA,
    finalRollingMae: Number(rollMae.toFixed(4)),
    finalRollingRmse: Number(rollRmse.toFixed(4)),
    finalRollingBias: Number(rollBias.toFixed(4)),
    finalRollingCrps: Number(rollCrps.toFixed(6)),
    trustScore: trust,
    sampleCount: records.length,
    series,
    note,
    dataStatus: 'demo_replay',
  };
}

// ──────────────────────────────────────────────────────────────
// Trust Change Explanations
// ──────────────────────────────────────────────────────────────

export interface TrustChangeExplanation {
  modelId: string;
  modelName: string;
  previousMae: number;      // simple (non-rolling) MAE
  rollingMae: number;       // exponential rolling MAE
  maeDelta: number;         // positive = degraded
  trustScore: number;
  adaptiveWeight: number;
  equalWeight: number;
  weightDelta: number;
  explanation: string;
  direction: 'improved' | 'degraded' | 'stable';
  dataStatus: 'demo_replay';
}

export function computeTrustExplanations(
  rollingResults: RollingSkillResult[],
  unit: string
): TrustChangeExplanation[] {
  const active = rollingResults.filter((r) => r.sampleCount > 0);
  if (active.length === 0) return [];

  const totalTrust = active.reduce((s, r) => s + r.trustScore, 0);
  const eqWeight = active.length > 0 ? Number((1.0 / active.length).toFixed(4)) : 0;

  return active.map((r) => {
    const simpleMae =
      r.series.length > 0
        ? Number((r.series.reduce((s, step) => s + step.absError, 0) / r.series.length).toFixed(4))
        : 0;

    const adaptiveW = totalTrust > 0 ? Number((r.trustScore / totalTrust).toFixed(4)) : eqWeight;
    const maeDelta = Number((r.finalRollingMae - simpleMae).toFixed(4));
    const weightDelta = Number((adaptiveW - eqWeight).toFixed(4));

    let direction: 'improved' | 'degraded' | 'stable' = 'stable';
    let explanation = '';

    if (Math.abs(maeDelta) < 0.001) {
      direction = 'stable';
      explanation =
        `${r.modelName}: Rolling MAE (${r.finalRollingMae.toFixed(3)} ${unit}) ` +
        `is consistent with simple average MAE (${simpleMae.toFixed(3)} ${unit}). ` +
        `Adaptive weight (${(adaptiveW * 100).toFixed(1)}%) reflects comparable skill.`;
    } else if (maeDelta > 0) {
      direction = 'degraded';
      explanation =
        `${r.modelName}: Recent rolling MAE (${r.finalRollingMae.toFixed(3)} ${unit}) ` +
        `exceeds simple average (${simpleMae.toFixed(3)} ${unit}) — recent skill degradation detected. ` +
        `Weight reduced to ${(adaptiveW * 100).toFixed(1)}% vs equal ${(eqWeight * 100).toFixed(1)}%.`;
    } else {
      direction = 'improved';
      explanation =
        `${r.modelName}: Recent rolling MAE (${r.finalRollingMae.toFixed(3)} ${unit}) ` +
        `is below simple average (${simpleMae.toFixed(3)} ${unit}) — recent skill improvement. ` +
        `Weight increased to ${(adaptiveW * 100).toFixed(1)}% vs equal ${(eqWeight * 100).toFixed(1)}%.`;
    }

    return {
      modelId: r.modelId,
      modelName: r.modelName,
      previousMae: simpleMae,
      rollingMae: r.finalRollingMae,
      maeDelta,
      trustScore: r.trustScore,
      adaptiveWeight: adaptiveW,
      equalWeight: eqWeight,
      weightDelta,
      explanation,
      direction,
      dataStatus: 'demo_replay' as const,
    };
  });
}
