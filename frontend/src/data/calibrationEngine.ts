/**
 * Context-Aware Forecast Calibration & Bias Correction Engine (Frontend)
 * Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 3
 *
 * Implements transparent, explainable mean bias correction:
 * bias = mean(forecast - observed)
 * calibrated_forecast = max(0, raw_forecast - bias) [for physical variables]
 */

export interface VerificationRecordPoint {
  locationId: string;
  variableId: string;
  leadHours: number;
  validTime: string;
  modelId: string;
  forecast: number;
  observed: number;
  dataStatus: 'demo_replay';
}

export interface CalibrationDetail {
  modelId: string;
  rawForecast: number;
  bias: number;
  calibratedForecast: number;
  sampleCount: number;
  calibrationSource: 'Location-specific' | 'Variable/lead fallback' | 'No correction';
  unit: string;
}

// Deterministic verification observations dataset embedded for client-side evaluation
export const VERIFICATION_DATASET: VerificationRecordPoint[] = [
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-25T12:00:00Z', modelId: 'ncmrwf_ncum', forecast: 15.0, observed: 14.0, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-25T12:00:00Z', modelId: 'ncmrwf_neps', forecast: 17.5, observed: 14.0, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-25T12:00:00Z', modelId: 'ai_graphcast', forecast: 12.0, observed: 14.0, dataStatus: 'demo_replay' },

  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-24T12:00:00Z', modelId: 'ncmrwf_ncum', forecast: 22.0, observed: 20.0, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-24T12:00:00Z', modelId: 'ncmrwf_neps', forecast: 25.0, observed: 20.0, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-24T12:00:00Z', modelId: 'ai_graphcast', forecast: 18.0, observed: 20.0, dataStatus: 'demo_replay' },

  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-23T12:00:00Z', modelId: 'ncmrwf_ncum', forecast: 8.0, observed: 8.5, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-23T12:00:00Z', modelId: 'ncmrwf_neps', forecast: 11.0, observed: 8.5, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-23T12:00:00Z', modelId: 'ai_graphcast', forecast: 6.5, observed: 8.5, dataStatus: 'demo_replay' },

  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-22T12:00:00Z', modelId: 'ncmrwf_ncum', forecast: 0.0, observed: 0.0, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-22T12:00:00Z', modelId: 'ncmrwf_neps', forecast: 2.0, observed: 0.0, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-22T12:00:00Z', modelId: 'ai_graphcast', forecast: 0.5, observed: 0.0, dataStatus: 'demo_replay' },

  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-21T12:00:00Z', modelId: 'ncmrwf_ncum', forecast: 30.0, observed: 28.0, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-21T12:00:00Z', modelId: 'ncmrwf_neps', forecast: 34.0, observed: 28.0, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-21T12:00:00Z', modelId: 'ai_graphcast', forecast: 25.0, observed: 28.0, dataStatus: 'demo_replay' },

  { locationId: 'DELHI', variableId: 'temperature', leadHours: 24, validTime: '2026-09-25T12:00:00Z', modelId: 'ncmrwf_ncum', forecast: 32.5, observed: 32.0, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'temperature', leadHours: 24, validTime: '2026-09-25T12:00:00Z', modelId: 'ncmrwf_neps', forecast: 31.8, observed: 32.0, dataStatus: 'demo_replay' },
  { locationId: 'DELHI', variableId: 'temperature', leadHours: 24, validTime: '2026-09-25T12:00:00Z', modelId: 'ai_graphcast', forecast: 32.2, observed: 32.0, dataStatus: 'demo_replay' },

  { locationId: 'MUMBAI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-25T12:00:00Z', modelId: 'ncmrwf_ncum', forecast: 75.0, observed: 70.0, dataStatus: 'demo_replay' },
  { locationId: 'MUMBAI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-25T12:00:00Z', modelId: 'ncmrwf_neps', forecast: 82.0, observed: 70.0, dataStatus: 'demo_replay' },
  { locationId: 'MUMBAI', variableId: 'rainfall', leadHours: 24, validTime: '2026-09-25T12:00:00Z', modelId: 'ai_graphcast', forecast: 67.0, observed: 70.0, dataStatus: 'demo_replay' },
];

export const calculateBias = (records: VerificationRecordPoint[]): number => {
  if (records.length === 0) return 0.0;
  const sumError = records.reduce((acc, r) => acc + (r.forecast - r.observed), 0);
  return Number((sumError / records.length).toFixed(3));
};

export const applyBiasCorrection = (
  rawForecast: number,
  bias: number,
  variableId: string
): number => {
  let corrected = rawForecast - bias;
  if (variableId === 'rainfall' || variableId === 'wind_speed') {
    corrected = Math.max(0, corrected);
  }
  return Number(corrected.toFixed(2));
};

export const calibrateForecast = (
  rawForecast: number,
  modelId: string,
  locationId: string,
  variableId: string,
  leadHours: number,
  unit: string
): CalibrationDetail => {
  // Level 1: Location-specific match
  const locMatch = VERIFICATION_DATASET.filter(
    (r) =>
      r.modelId === modelId &&
      r.locationId.toUpperCase() === locationId.toUpperCase() &&
      r.variableId.toLowerCase() === variableId.toLowerCase() &&
      r.leadHours === leadHours
  );

  if (locMatch.length > 0) {
    const bias = calculateBias(locMatch);
    const calibrated = applyBiasCorrection(rawForecast, bias, variableId);
    return {
      modelId,
      rawForecast,
      bias,
      calibratedForecast: calibrated,
      sampleCount: locMatch.length,
      calibrationSource: 'Location-specific',
      unit,
    };
  }

  // Level 2: Variable + Lead Time Fallback
  const fallbackMatch = VERIFICATION_DATASET.filter(
    (r) =>
      r.modelId === modelId &&
      r.variableId.toLowerCase() === variableId.toLowerCase() &&
      r.leadHours === leadHours
  );

  if (fallbackMatch.length > 0) {
    const bias = calculateBias(fallbackMatch);
    const calibrated = applyBiasCorrection(rawForecast, bias, variableId);
    return {
      modelId,
      rawForecast,
      bias,
      calibratedForecast: calibrated,
      sampleCount: fallbackMatch.length,
      calibrationSource: 'Variable/lead fallback',
      unit,
    };
  }

  // Level 3: No correction
  return {
    modelId,
    rawForecast,
    bias: 0.0,
    calibratedForecast: rawForecast,
    sampleCount: 0,
    calibrationSource: 'No correction',
    unit,
  };
};
