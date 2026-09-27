export interface EnsembleInfo {
  member_id?: string;
  total_members?: number;
  percentile?: number;
  std_dev?: number;
}

export interface ForecastSource {
  source_id: string;
  source_name: string;
  model_type: string;
  forecast_time: string;
  issue_time: string;
  valid_time: string;
  latitude: number;
  longitude: number;
  variable: string;
  lead_time: number;
  value?: number;
  unit: string;
  ensemble?: EnsembleInfo;
  data_status: 'healthy' | 'delayed' | 'unavailable' | 'invalid' | 'stale' | 'demo_replay';
  metadata?: Record<string, any>;
}

export interface Observation {
  observation_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  variable: string;
  value: number;
  unit: string;
  source: string;
  quality_flag?: string;
  metadata?: Record<string, any>;
}

export interface ModelHealth {
  source_id: string;
  freshness: string;
  availability: number;
  latency: number;
  missing_data: boolean;
  anomaly_status: 'normal' | 'warning' | 'critical' | 'unknown';
  health_status: 'healthy' | 'degraded' | 'failing' | 'offline' | 'demo_replay';
  last_successful_update?: string;
  metadata?: Record<string, any>;
}

export interface ModelSkill {
  source_id: string;
  region: string;
  variable: string;
  lead_time: number;
  season: string;
  weather_regime: string;
  metric: string;
  score: number;
  verification_period: string;
  metadata?: Record<string, any>;
}

export interface ModelWeight {
  source_id: string;
  weight: number;
  reason: string;
  calculated_at: string;
  variable?: string;
  lead_time?: number;
  metadata?: Record<string, any>;
}

export interface SystemConfig {
  project_name: string;
  organization: string;
  environment: string;
  data_mode: string;
  forecast_sources: Array<{
    source_id: string;
    source_name: string;
    model_type: string;
    endpoint_url?: string;
    enabled: boolean;
    is_live_connected: boolean;
    status_label: string;
  }>;
  observation_sources: Array<{
    source_id: string;
    source_name: string;
    provider_type: string;
    endpoint_url?: string;
    enabled: boolean;
    is_live_connected: boolean;
    status_label: string;
  }>;
}
