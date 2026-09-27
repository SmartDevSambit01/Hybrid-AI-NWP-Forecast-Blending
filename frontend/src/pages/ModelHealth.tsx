import type { ModelHealth as ModelHealthType } from '../types';
import { useForecast } from '../context/ForecastContext';
import { Activity, Server } from 'lucide-react';

interface ModelHealthProps {
  healthList: ModelHealthType[];
}

export const ModelHealth = ({ healthList }: ModelHealthProps) => {
  const { modelSwitches } = useForecast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Banner */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <Activity size={18} style={{ color: '#10b981' }} />
            <span>Continuous Model Feed Health & Ingestion Pipeline Monitor</span>
          </div>
          <span className="tag">Operational Diagnostics</span>
        </div>
        <p style={{ fontSize: '13px', color: '#94a3b8' }}>
          Real-time tracking of NWP and AI model ingestion pipelines. Reflects both pipeline status and user-configured ON/OFF switches in real-time.
        </p>
      </div>

      {/* Model Feed Cards */}
      <div className="grid-cols-3">
        {healthList.map((item) => {
          const isEnabled = modelSwitches[item.source_id] !== false;
          return (
            <div
              key={item.source_id}
              className="dash-card"
              style={{
                opacity: isEnabled ? 1 : 0.6,
                borderColor: isEnabled ? '#243452' : '#334155',
                transition: 'all 0.2s ease',
              }}
            >
              <div className="dash-card-header">
                <span className="tag" style={{ fontWeight: 600 }}>
                  {item.source_id.toUpperCase()}
                </span>
                <span className={`status-badge ${isEnabled ? item.health_status : 'unavailable'}`}>
                  {isEnabled ? item.health_status : 'user_disabled'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div className="card-value-lg" style={{ color: isEnabled ? '#f1f5f9' : '#64748b' }}>
                  {isEnabled ? `${item.latency}s` : 'Paused'}
                </div>
                <span className="card-subtitle">
                  {isEnabled ? 'Ingestion Latency' : 'Stream Bypassed'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  fontSize: '13px',
                  paddingTop: 12,
                  borderTop: '1px solid #243452',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Switch State:</span>
                  <span style={{ color: isEnabled ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {isEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Pipeline Freshness:</span>
                  <span style={{ color: '#10b981', fontWeight: 500 }}>{item.freshness}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Availability Rate:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {(item.availability * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Missing Data Flag:</span>
                  <span style={{ color: item.missing_data ? '#ef4444' : '#10b981' }}>
                    {item.missing_data ? 'YES (Dropout)' : 'NO'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Anomaly Status:</span>
                  <span className="tag">{item.anomaly_status.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '11px', color: '#64748b' }}>
                  <span>Last Verified Update:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {item.last_successful_update?.slice(0, 19) ?? 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Taxonomy Reference */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <Server size={16} style={{ color: '#06b6d4' }} />
            <span>System Data Status Taxonomy Standard</span>
          </div>
        </div>
        <div className="grid-cols-4">
          {[
            { label: 'HEALTHY', cls: 'healthy', desc: 'Stream on schedule, zero missing grids, latency within threshold.' },
            { label: 'USER_DISABLED', cls: 'unavailable', desc: 'Model manually bypassed via UI switch; excluded from active blend.' },
            { label: 'DELAYED / STALE', cls: 'delayed', desc: 'Model run delayed >15m or last run timestamp out of window.' },
            { label: 'DEMO_REPLAY', cls: 'demo_replay', desc: 'Deterministic replay test dataset active for Step 2 validation.' },
          ].map(({ label, cls, desc }) => (
            <div key={label} style={{ background: '#131b2e', padding: 12, borderRadius: 8, border: '1px solid #243452' }}>
              <span className={`status-badge ${cls}`} style={{ marginBottom: 6, display: 'inline-flex' }}>{label}</span>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: 8 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
