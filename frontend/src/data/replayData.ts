/**
 * Centralized Demo/Replay Forecast Dataset and Engine
 * Ministry of Earth Sciences (MoES) / NCMRWF Prototype - Step 2
 *
 * Provides deterministic, structured weather forecasts across 6 operational locations,
 * 3 meteorological variables, 6 forecast lead times, and 3 model sources.
 *
 * ALL DATA IS CLEARLY LABELED AS demo_replay.
 */

export interface LocationInfo {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  elevationMeters: number;
}

export interface VariableInfo {
  id: string;
  name: string;
  unit: string;
  description: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  shortName: string;
  type: 'nwp_deterministic' | 'nwp_ensemble' | 'ai_ml';
  resolution: string;
  color: string;
}

export interface ReplayForecastPoint {
  locationId: string;
  variableId: string;
  leadHours: number;
  modelId: string;
  value: number;
  unit: string;
  ensembleSpread?: number;
  dataStatus: 'demo_replay';
  issueTime: string;
  validTime: string;
}

export const LOCATIONS: LocationInfo[] = [
  { id: 'DELHI', name: 'New Delhi', state: 'Delhi NCR', lat: 28.61, lon: 77.20, elevationMeters: 216 },
  { id: 'MUMBAI', name: 'Mumbai', state: 'Maharashtra', lat: 19.07, lon: 72.87, elevationMeters: 14 },
  { id: 'KOLKATA', name: 'Kolkata', state: 'West Bengal', lat: 22.57, lon: 88.36, elevationMeters: 9 },
  { id: 'CHENNAI', name: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lon: 80.27, elevationMeters: 6 },
  { id: 'GUWAHATI', name: 'Guwahati', state: 'Assam', lat: 26.14, lon: 91.73, elevationMeters: 55 },
  { id: 'BHUBANESWAR', name: 'Bhubaneswar', state: 'Odisha', lat: 20.29, lon: 85.82, elevationMeters: 45 },
];

export const VARIABLES: VariableInfo[] = [
  { id: 'rainfall', name: 'Precipitation / Rainfall', unit: 'mm', description: 'Accumulated surface rainfall' },
  { id: 'temperature', name: 'Surface Temperature (2m)', unit: '°C', description: 'Dry bulb air temperature at 2m height' },
  { id: 'wind_speed', name: 'Wind Speed (10m)', unit: 'km/h', description: 'Sustained horizontal wind speed at 10m' },
];

export const LEAD_TIMES: number[] = [6, 12, 24, 48, 72, 96];

export const MODELS: ModelInfo[] = [
  {
    id: 'ncmrwf_ncum',
    name: 'NCMRWF NCUM (Global NWP)',
    shortName: 'NCUM',
    type: 'nwp_deterministic',
    resolution: '12km Global',
    color: '#06b6d4',
  },
  {
    id: 'ncmrwf_neps',
    name: 'NCMRWF NEPS (Ensemble NWP)',
    shortName: 'NEPS',
    type: 'nwp_ensemble',
    resolution: '12km (11 Members)',
    color: '#3b82f6',
  },
  {
    id: 'ai_graphcast',
    name: 'AI Weather Model (Deep Learning)',
    shortName: 'AI Model',
    type: 'ai_ml',
    resolution: '0.25° Lat-Lon',
    color: '#8b5cf6',
  },
];

// Deterministic forecast table for all combinations:
// [locationId][variableId][leadHours][modelId] = value
const DETERMINISTIC_GRID: Record<string, Record<string, Record<number, Record<string, number>>>> = {
  DELHI: {
    rainfall: {
      6: { ncmrwf_ncum: 0.0, ncmrwf_neps: 0.2, ai_graphcast: 0.0 },
      12: { ncmrwf_ncum: 2.4, ncmrwf_neps: 3.1, ai_graphcast: 1.8 },
      24: { ncmrwf_ncum: 14.2, ncmrwf_neps: 16.5, ai_graphcast: 12.8 },
      48: { ncmrwf_ncum: 38.0, ncmrwf_neps: 42.4, ai_graphcast: 34.6 },
      72: { ncmrwf_ncum: 22.5, ncmrwf_neps: 25.0, ai_graphcast: 19.8 },
      96: { ncmrwf_ncum: 8.0, ncmrwf_neps: 9.5, ai_graphcast: 6.5 },
    },
    temperature: {
      6: { ncmrwf_ncum: 31.8, ncmrwf_neps: 31.5, ai_graphcast: 32.1 },
      12: { ncmrwf_ncum: 34.2, ncmrwf_neps: 33.9, ai_graphcast: 34.5 },
      24: { ncmrwf_ncum: 32.0, ncmrwf_neps: 31.7, ai_graphcast: 32.4 },
      48: { ncmrwf_ncum: 29.5, ncmrwf_neps: 29.1, ai_graphcast: 29.8 },
      72: { ncmrwf_ncum: 30.8, ncmrwf_neps: 30.4, ai_graphcast: 31.2 },
      96: { ncmrwf_ncum: 32.5, ncmrwf_neps: 32.0, ai_graphcast: 32.8 },
    },
    wind_speed: {
      6: { ncmrwf_ncum: 14.0, ncmrwf_neps: 13.5, ai_graphcast: 14.8 },
      12: { ncmrwf_ncum: 18.5, ncmrwf_neps: 17.8, ai_graphcast: 19.2 },
      24: { ncmrwf_ncum: 24.0, ncmrwf_neps: 22.5, ai_graphcast: 25.1 },
      48: { ncmrwf_ncum: 32.0, ncmrwf_neps: 30.5, ai_graphcast: 33.5 },
      72: { ncmrwf_ncum: 20.5, ncmrwf_neps: 19.8, ai_graphcast: 21.0 },
      96: { ncmrwf_ncum: 15.0, ncmrwf_neps: 14.2, ai_graphcast: 15.6 },
    },
  },
  MUMBAI: {
    rainfall: {
      6: { ncmrwf_ncum: 8.5, ncmrwf_neps: 10.2, ai_graphcast: 7.9 },
      12: { ncmrwf_ncum: 28.0, ncmrwf_neps: 32.5, ai_graphcast: 26.4 },
      24: { ncmrwf_ncum: 72.0, ncmrwf_neps: 84.0, ai_graphcast: 68.5 },
      48: { ncmrwf_ncum: 110.5, ncmrwf_neps: 125.0, ai_graphcast: 104.0 },
      72: { ncmrwf_ncum: 65.0, ncmrwf_neps: 70.2, ai_graphcast: 59.0 },
      96: { ncmrwf_ncum: 35.0, ncmrwf_neps: 38.5, ai_graphcast: 31.0 },
    },
    temperature: {
      6: { ncmrwf_ncum: 28.5, ncmrwf_neps: 28.2, ai_graphcast: 28.8 },
      12: { ncmrwf_ncum: 30.2, ncmrwf_neps: 29.8, ai_graphcast: 30.4 },
      24: { ncmrwf_ncum: 28.8, ncmrwf_neps: 28.5, ai_graphcast: 29.0 },
      48: { ncmrwf_ncum: 27.5, ncmrwf_neps: 27.2, ai_graphcast: 27.9 },
      72: { ncmrwf_ncum: 28.2, ncmrwf_neps: 28.0, ai_graphcast: 28.5 },
      96: { ncmrwf_ncum: 29.0, ncmrwf_neps: 28.8, ai_graphcast: 29.3 },
    },
    wind_speed: {
      6: { ncmrwf_ncum: 26.0, ncmrwf_neps: 28.5, ai_graphcast: 27.0 },
      12: { ncmrwf_ncum: 35.0, ncmrwf_neps: 38.0, ai_graphcast: 36.5 },
      24: { ncmrwf_ncum: 48.0, ncmrwf_neps: 52.0, ai_graphcast: 46.5 },
      48: { ncmrwf_ncum: 55.0, ncmrwf_neps: 60.0, ai_graphcast: 53.0 },
      72: { ncmrwf_ncum: 40.0, ncmrwf_neps: 42.5, ai_graphcast: 38.0 },
      96: { ncmrwf_ncum: 28.0, ncmrwf_neps: 30.0, ai_graphcast: 27.5 },
    },
  },
  KOLKATA: {
    rainfall: {
      6: { ncmrwf_ncum: 2.0, ncmrwf_neps: 2.5, ai_graphcast: 1.8 },
      12: { ncmrwf_ncum: 12.5, ncmrwf_neps: 14.0, ai_graphcast: 11.2 },
      24: { ncmrwf_ncum: 34.0, ncmrwf_neps: 38.5, ai_graphcast: 31.0 },
      48: { ncmrwf_ncum: 58.0, ncmrwf_neps: 64.0, ai_graphcast: 52.5 },
      72: { ncmrwf_ncum: 42.0, ncmrwf_neps: 46.0, ai_graphcast: 38.0 },
      96: { ncmrwf_ncum: 18.0, ncmrwf_neps: 20.5, ai_graphcast: 16.0 },
    },
    temperature: {
      6: { ncmrwf_ncum: 29.5, ncmrwf_neps: 29.2, ai_graphcast: 29.9 },
      12: { ncmrwf_ncum: 32.8, ncmrwf_neps: 32.4, ai_graphcast: 33.1 },
      24: { ncmrwf_ncum: 30.5, ncmrwf_neps: 30.1, ai_graphcast: 30.9 },
      48: { ncmrwf_ncum: 28.5, ncmrwf_neps: 28.2, ai_graphcast: 29.0 },
      72: { ncmrwf_ncum: 29.8, ncmrwf_neps: 29.5, ai_graphcast: 30.2 },
      96: { ncmrwf_ncum: 31.2, ncmrwf_neps: 30.8, ai_graphcast: 31.6 },
    },
    wind_speed: {
      6: { ncmrwf_ncum: 16.0, ncmrwf_neps: 15.0, ai_graphcast: 17.0 },
      12: { ncmrwf_ncum: 22.0, ncmrwf_neps: 21.0, ai_graphcast: 23.5 },
      24: { ncmrwf_ncum: 32.0, ncmrwf_neps: 30.5, ai_graphcast: 33.8 },
      48: { ncmrwf_ncum: 42.0, ncmrwf_neps: 40.0, ai_graphcast: 44.0 },
      72: { ncmrwf_ncum: 28.0, ncmrwf_neps: 26.5, ai_graphcast: 29.0 },
      96: { ncmrwf_ncum: 18.0, ncmrwf_neps: 17.0, ai_graphcast: 19.0 },
    },
  },
  CHENNAI: {
    rainfall: {
      6: { ncmrwf_ncum: 0.5, ncmrwf_neps: 0.8, ai_graphcast: 0.4 },
      12: { ncmrwf_ncum: 5.2, ncmrwf_neps: 6.8, ai_graphcast: 4.5 },
      24: { ncmrwf_ncum: 22.0, ncmrwf_neps: 26.5, ai_graphcast: 19.5 },
      48: { ncmrwf_ncum: 48.0, ncmrwf_neps: 55.0, ai_graphcast: 43.0 },
      72: { ncmrwf_ncum: 36.0, ncmrwf_neps: 40.2, ai_graphcast: 32.5 },
      96: { ncmrwf_ncum: 15.0, ncmrwf_neps: 17.5, ai_graphcast: 13.0 },
    },
    temperature: {
      6: { ncmrwf_ncum: 30.5, ncmrwf_neps: 30.2, ai_graphcast: 30.8 },
      12: { ncmrwf_ncum: 35.0, ncmrwf_neps: 34.6, ai_graphcast: 35.4 },
      24: { ncmrwf_ncum: 32.5, ncmrwf_neps: 32.1, ai_graphcast: 32.9 },
      48: { ncmrwf_ncum: 30.0, ncmrwf_neps: 29.6, ai_graphcast: 30.5 },
      72: { ncmrwf_ncum: 31.5, ncmrwf_neps: 31.0, ai_graphcast: 32.0 },
      96: { ncmrwf_ncum: 33.0, ncmrwf_neps: 32.5, ai_graphcast: 33.5 },
    },
    wind_speed: {
      6: { ncmrwf_ncum: 18.0, ncmrwf_neps: 17.0, ai_graphcast: 19.0 },
      12: { ncmrwf_ncum: 25.0, ncmrwf_neps: 24.0, ai_graphcast: 26.5 },
      24: { ncmrwf_ncum: 38.0, ncmrwf_neps: 36.0, ai_graphcast: 40.0 },
      48: { ncmrwf_ncum: 45.0, ncmrwf_neps: 43.5, ai_graphcast: 47.0 },
      72: { ncmrwf_ncum: 30.0, ncmrwf_neps: 28.5, ai_graphcast: 31.5 },
      96: { ncmrwf_ncum: 20.0, ncmrwf_neps: 19.0, ai_graphcast: 21.0 },
    },
  },
  GUWAHATI: {
    rainfall: {
      6: { ncmrwf_ncum: 4.5, ncmrwf_neps: 5.8, ai_graphcast: 4.0 },
      12: { ncmrwf_ncum: 18.0, ncmrwf_neps: 22.0, ai_graphcast: 16.5 },
      24: { ncmrwf_ncum: 52.0, ncmrwf_neps: 60.5, ai_graphcast: 47.0 },
      48: { ncmrwf_ncum: 88.0, ncmrwf_neps: 98.0, ai_graphcast: 80.5 },
      72: { ncmrwf_ncum: 54.0, ncmrwf_neps: 60.0, ai_graphcast: 49.0 },
      96: { ncmrwf_ncum: 25.0, ncmrwf_neps: 28.0, ai_graphcast: 22.0 },
    },
    temperature: {
      6: { ncmrwf_ncum: 26.5, ncmrwf_neps: 26.1, ai_graphcast: 26.9 },
      12: { ncmrwf_ncum: 29.8, ncmrwf_neps: 29.4, ai_graphcast: 30.2 },
      24: { ncmrwf_ncum: 27.5, ncmrwf_neps: 27.1, ai_graphcast: 27.9 },
      48: { ncmrwf_ncum: 25.0, ncmrwf_neps: 24.6, ai_graphcast: 25.5 },
      72: { ncmrwf_ncum: 26.2, ncmrwf_neps: 25.8, ai_graphcast: 26.7 },
      96: { ncmrwf_ncum: 28.0, ncmrwf_neps: 27.5, ai_graphcast: 28.5 },
    },
    wind_speed: {
      6: { ncmrwf_ncum: 10.0, ncmrwf_neps: 9.0, ai_graphcast: 11.0 },
      12: { ncmrwf_ncum: 14.5, ncmrwf_neps: 13.5, ai_graphcast: 15.5 },
      24: { ncmrwf_ncum: 22.0, ncmrwf_neps: 20.5, ai_graphcast: 23.5 },
      48: { ncmrwf_ncum: 30.0, ncmrwf_neps: 28.0, ai_graphcast: 32.0 },
      72: { ncmrwf_ncum: 18.0, ncmrwf_neps: 16.5, ai_graphcast: 19.5 },
      96: { ncmrwf_ncum: 12.0, ncmrwf_neps: 11.0, ai_graphcast: 13.0 },
    },
  },
  BHUBANESWAR: {
    rainfall: {
      6: { ncmrwf_ncum: 3.2, ncmrwf_neps: 4.0, ai_graphcast: 2.9 },
      12: { ncmrwf_ncum: 16.5, ncmrwf_neps: 19.2, ai_graphcast: 14.8 },
      24: { ncmrwf_ncum: 46.0, ncmrwf_neps: 53.0, ai_graphcast: 41.5 },
      48: { ncmrwf_ncum: 82.0, ncmrwf_neps: 92.5, ai_graphcast: 75.0 },
      72: { ncmrwf_ncum: 48.0, ncmrwf_neps: 54.0, ai_graphcast: 43.5 },
      96: { ncmrwf_ncum: 20.0, ncmrwf_neps: 23.0, ai_graphcast: 18.0 },
    },
    temperature: {
      6: { ncmrwf_ncum: 29.0, ncmrwf_neps: 28.7, ai_graphcast: 29.4 },
      12: { ncmrwf_ncum: 33.5, ncmrwf_neps: 33.1, ai_graphcast: 33.9 },
      24: { ncmrwf_ncum: 30.0, ncmrwf_neps: 29.6, ai_graphcast: 30.4 },
      48: { ncmrwf_ncum: 27.8, ncmrwf_neps: 27.4, ai_graphcast: 28.2 },
      72: { ncmrwf_ncum: 29.2, ncmrwf_neps: 28.8, ai_graphcast: 29.6 },
      96: { ncmrwf_ncum: 31.5, ncmrwf_neps: 31.0, ai_graphcast: 32.0 },
    },
    wind_speed: {
      6: { ncmrwf_ncum: 20.0, ncmrwf_neps: 19.0, ai_graphcast: 21.5 },
      12: { ncmrwf_ncum: 28.0, ncmrwf_neps: 27.0, ai_graphcast: 29.5 },
      24: { ncmrwf_ncum: 42.0, ncmrwf_neps: 40.0, ai_graphcast: 44.5 },
      48: { ncmrwf_ncum: 50.0, ncmrwf_neps: 48.0, ai_graphcast: 52.0 },
      72: { ncmrwf_ncum: 32.0, ncmrwf_neps: 30.5, ai_graphcast: 34.0 },
      96: { ncmrwf_ncum: 22.0, ncmrwf_neps: 21.0, ai_graphcast: 23.0 },
    },
  },
};

export const getReplayForecast = (
  locationId: string,
  variableId: string,
  leadHours: number,
  modelId: string
): ReplayForecastPoint | null => {
  const loc = LOCATIONS.find((l) => l.id === locationId);
  const v = VARIABLES.find((varItem) => varItem.id === variableId);
  const m = MODELS.find((mod) => mod.id === modelId);

  if (!loc || !v || !m) return null;

  const locData = DETERMINISTIC_GRID[locationId];
  if (!locData) return null;
  const varData = locData[variableId];
  if (!varData) return null;
  const leadData = varData[leadHours];
  if (!leadData) return null;
  const val = leadData[modelId];
  if (val === undefined) return null;

  const baseDate = new Date('2026-09-26T00:00:00Z');
  const validDate = new Date(baseDate.getTime() + leadHours * 3600000);

  return {
    locationId,
    variableId,
    leadHours,
    modelId,
    value: val,
    unit: v.unit,
    ensembleSpread: modelId === 'ncmrwf_neps' ? Number((val * 0.08 + 0.5).toFixed(2)) : undefined,
    dataStatus: 'demo_replay',
    issueTime: '2026-09-26T03:00:00Z',
    validTime: validDate.toISOString(),
  };
};

export const getForecastBundle = (
  locationId: string,
  variableId: string,
  leadHours: number
): ReplayForecastPoint[] => {
  return MODELS.map((m) => getReplayForecast(locationId, variableId, leadHours, m.id)).filter(
    (pt): pt is ReplayForecastPoint => pt !== null
  );
};
