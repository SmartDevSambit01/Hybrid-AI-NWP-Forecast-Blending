import type { ForecastSource, Observation, ModelHealth, ModelSkill, ModelWeight, SystemConfig } from '../types';

const API_BASE = 'http://localhost:8000/api';

async function fetchJson<T>(endpoint: string, fallback: T): Promise<{ data: T; isLive: boolean }> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return { data, isLive: true };
  } catch (err) {
    console.warn(`Backend API ${endpoint} unreachable, using fallback demo state.`, err);
    return { data: fallback, isLive: false };
  }
}

export const apiService = {
  getHealth: () => fetchJson<{ status: string; data_mode: string }>('/health', { status: 'offline', data_mode: 'demo_replay' }),
  
  getConfig: () => fetchJson<SystemConfig>('/config', {
    project_name: "Hybrid AI–NWP Multi-Model Forecast Blending System",
    organization: "Ministry of Earth Sciences (MoES) / NCMRWF",
    environment: "development",
    data_mode: "demo_replay",
    forecast_sources: [
      { source_id: 'ncmrwf_ncum', source_name: 'NCMRWF NCUM', model_type: 'nwp_deterministic', enabled: true, is_live_connected: false, status_label: 'demo_replay' },
      { source_id: 'ncmrwf_neps', source_name: 'NCMRWF NEPS', model_type: 'nwp_ensemble', enabled: true, is_live_connected: false, status_label: 'demo_replay' },
      { source_id: 'ai_graphcast', source_name: 'AI Weather Model', model_type: 'ai_ml', enabled: true, is_live_connected: false, status_label: 'demo_replay' },
      { source_id: 'demo_replay', source_name: 'Demo Replay Source', model_type: 'demo_replay', enabled: true, is_live_connected: false, status_label: 'demo_replay' },
    ],
    observation_sources: [
      { source_id: 'obs_provider_main', source_name: 'AWS Station Network', provider_type: 'aws_synop', enabled: true, is_live_connected: false, status_label: 'demo_replay' }
    ]
  }),

  getForecasts: () => fetchJson<ForecastSource[]>('/forecasts', [
    {
      source_id: 'ncmrwf_ncum',
      source_name: 'NCMRWF NCUM (Global NWP)',
      model_type: 'nwp_deterministic',
      forecast_time: new Date().toISOString(),
      issue_time: new Date().toISOString(),
      valid_time: new Date().toISOString(),
      latitude: 28.61,
      longitude: 77.20,
      variable: 'temperature_2m',
      lead_time: 12,
      value: 305.15,
      unit: 'K',
      data_status: 'demo_replay'
    },
    {
      source_id: 'ncmrwf_neps',
      source_name: 'NCMRWF NEPS (Ensemble NWP)',
      model_type: 'nwp_ensemble',
      forecast_time: new Date().toISOString(),
      issue_time: new Date().toISOString(),
      valid_time: new Date().toISOString(),
      latitude: 28.61,
      longitude: 77.20,
      variable: 'temperature_2m',
      lead_time: 12,
      value: 304.85,
      unit: 'K',
      ensemble: { member_id: 'neps_mean', total_members: 11, std_dev: 0.65 },
      data_status: 'demo_replay'
    },
    {
      source_id: 'ai_graphcast',
      source_name: 'AI Weather Model (Deep Learning)',
      model_type: 'ai_ml',
      forecast_time: new Date().toISOString(),
      issue_time: new Date().toISOString(),
      valid_time: new Date().toISOString(),
      latitude: 28.61,
      longitude: 77.20,
      variable: 'temperature_2m',
      lead_time: 12,
      value: 305.40,
      unit: 'K',
      data_status: 'demo_replay'
    }
  ]),

  getObservations: () => fetchJson<Observation[]>('/observations', [
    {
      observation_id: 'OBS_DELHI_001',
      timestamp: new Date().toISOString(),
      latitude: 28.61,
      longitude: 77.20,
      variable: 'temperature_2m',
      value: 305.00,
      unit: 'K',
      source: 'DEMO_REPLAY_AWS',
      quality_flag: 'passed'
    }
  ]),

  getModelHealth: () => fetchJson<ModelHealth[]>('/model-health', [
    { source_id: 'ncmrwf_ncum', freshness: 'on_schedule', availability: 1.0, latency: 45.2, missing_data: false, anomaly_status: 'normal', health_status: 'demo_replay', last_successful_update: new Date().toISOString() },
    { source_id: 'ncmrwf_neps', freshness: 'on_schedule', availability: 0.95, latency: 62.0, missing_data: false, anomaly_status: 'normal', health_status: 'demo_replay', last_successful_update: new Date().toISOString() },
    { source_id: 'ai_graphcast', freshness: 'on_schedule', availability: 1.0, latency: 12.4, missing_data: false, anomaly_status: 'normal', health_status: 'demo_replay', last_successful_update: new Date().toISOString() }
  ]),

  getModelWeights: () => fetchJson<ModelWeight[]>('/model-weights', [
    { source_id: 'ncmrwf_ncum', weight: 0.34, reason: 'Step 1 Equal Weight Baseline Placeholder', calculated_at: new Date().toISOString() },
    { source_id: 'ncmrwf_neps', weight: 0.33, reason: 'Step 1 Equal Weight Baseline Placeholder', calculated_at: new Date().toISOString() },
    { source_id: 'ai_graphcast', weight: 0.33, reason: 'Step 1 Equal Weight Baseline Placeholder', calculated_at: new Date().toISOString() }
  ]),

  getVerification: () => fetchJson<ModelSkill[]>('/verification', [
    { source_id: 'ncmrwf_ncum', region: 'PAN_INDIA', variable: 'temperature_2m', lead_time: 24, season: 'MONSOON', weather_regime: 'MONSOON_TROUGH', metric: 'RMSE', score: 1.42, verification_period: 'DEMO_HISTORICAL' },
    { source_id: 'ncmrwf_neps', region: 'PAN_INDIA', variable: 'temperature_2m', lead_time: 24, season: 'MONSOON', weather_regime: 'MONSOON_TROUGH', metric: 'RMSE', score: 1.28, verification_period: 'DEMO_HISTORICAL' },
    { source_id: 'ai_graphcast', region: 'PAN_INDIA', variable: 'temperature_2m', lead_time: 24, season: 'MONSOON', weather_regime: 'MONSOON_TROUGH', metric: 'RMSE', score: 1.35, verification_period: 'DEMO_HISTORICAL' }
  ])
};
