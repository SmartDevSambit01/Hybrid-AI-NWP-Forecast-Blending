import type { ModelHealth } from '../types';
import { useForecast } from '../context/ForecastContext';
import { WeatherMapShell } from '../maps/WeatherMapShell';
import { ShieldAlert, Cpu, Activity, Scale, BarChart3, Database, Sparkles } from 'lucide-react';

interface OverviewProps {
  health: ModelHealth[];
  dataMode: string;
}

export const Overview = ({
  health,
  dataMode,
}: OverviewProps) => {
  const {
    currentLocation,
    currentVariable,
    selectedLeadTime,
    blendingStrategy,
    blendResult,
    modelSwitches,
  } = useForecast();

  const activeModels = blendResult.modelTrusts.filter((m) => m.isActive);
  const bestModel = activeModels.length > 0 ? activeModels.reduce((prev, curr) => (curr.mae < prev.mae ? curr : prev), activeModels[0]) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Notice Banner */}
      <div className="notice-banner">
        <ShieldAlert size={18} />
        <div>
          <strong>Operational Data Notice:</strong> You are viewing the operational prototype dashboard in{' '}
          <strong>{dataMode.toUpperCase()}</strong> mode. Dynamic model trust and calibration are active for{' '}
          <strong>{currentLocation.name}</strong> (+{selectedLeadTime}h lead).
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid-cols-4">
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="card-subtitle">Active Weather Models</span>
            <Cpu size={16} style={{ color: '#06b6d4' }} />
          </div>
          <div className="card-value-lg">
            {blendResult.activeCount}/{blendResult.totalModels}
          </div>
          <span className="tag">
            {blendResult.modelTrusts
              .filter((m) => m.isActive)
              .map((m) => m.shortName)
              .join(' • ') || 'None Active'}
          </span>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <span className="card-subtitle">Dynamic Blending Strategy</span>
            <Sparkles size={16} style={{ color: '#10b981' }} />
          </div>
          <div className="card-value-lg" style={{ fontSize: '18px', color: blendingStrategy === 'adaptive_skill' ? '#10b981' : '#f59e0b' }}>
            {blendingStrategy === 'adaptive_skill' ? 'Adaptive Skill' : 'Equal Baseline'}
          </div>
          <span className="tag">
            {bestModel ? `Top Trust: ${bestModel.shortName} (${(bestModel.adaptiveWeight * 100).toFixed(0)}%)` : 'Equal Weights'}
          </span>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <span className="card-subtitle">Calibrated Blend (+{selectedLeadTime}h)</span>
            <Scale size={16} style={{ color: '#06b6d4' }} />
          </div>
          <div className="card-value-lg" style={{ color: '#10b981', fontSize: '24px' }}>
            {blendResult.calibratedBlendedValue !== null
              ? `${blendResult.calibratedBlendedValue} ${currentVariable.unit}`
              : 'N/A (Disabled)'}
          </div>
          <span className="tag">
            Raw Baseline: {blendResult.rawBlendedValue ?? 'N/A'} {currentVariable.unit}
          </span>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <span className="card-subtitle">Lowest Recent MAE</span>
            <BarChart3 size={16} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="card-value-lg" style={{ fontSize: '24px', color: '#06b6d4' }}>
            {bestModel ? `${bestModel.mae.toFixed(2)} ${currentVariable.unit}` : 'N/A'}
          </div>
          <span className="tag">
            {bestModel ? `${bestModel.shortName} (n=${bestModel.sampleCount})` : 'Replay Stream'}
          </span>
        </div>
      </div>

      {/* Map Shell + Model Weight Distribution Card */}
      <div className="grid-cols-3">
        <div style={{ gridColumn: 'span 2' }}>
          <WeatherMapShell
            title={`Regional Grid Monitor — ${currentLocation.name} (${currentLocation.lat}°N, ${currentLocation.lon}°E)`}
          />
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <Scale size={16} style={{ color: '#06b6d4' }} />
              <span>Dynamic Weight Allocation</span>
            </div>
            <span className="tag" style={{ color: blendingStrategy === 'adaptive_skill' ? '#10b981' : '#f59e0b' }}>
              {blendingStrategy === 'adaptive_skill' ? 'Adaptive' : 'Equal 1/N'}
            </span>
          </div>

          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
            Trust weights dynamically normalized from historical replay MAE.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            {blendResult.modelTrusts.map((w) => {
              const activeWeight = blendingStrategy === 'adaptive_skill' ? w.adaptiveWeight : w.equalWeight;
              return (
                <div key={w.modelId} style={{ opacity: w.isActive ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{w.shortName}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {w.isActive ? `${(activeWeight * 100).toFixed(1)}%` : '0.0% (OFF)'}
                    </span>
                  </div>
                  <div className="weight-bar-bg">
                    <div
                      className="weight-segment"
                      style={{
                        width: `${activeWeight * 100}%`,
                        backgroundColor: w.isActive ? w.color : '#475569',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #243452', fontSize: '11px', color: '#64748b' }}>
            Weights dynamically update when location, variable, lead time, or model switches change.
          </div>
        </div>
      </div>

      {/* Forecast Breakdown Table & Model Ingestion Matrix */}
      <div className="grid-cols-2">
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <Database size={16} style={{ color: '#06b6d4' }} />
              <span>Forecast & Calibration Breakdown</span>
            </div>
            <span className="tag">+{selectedLeadTime}h Lead</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model Source</th>
                <th>Raw</th>
                <th>Bias (μ)</th>
                <th>Calibrated</th>
                <th>Trust Weight</th>
              </tr>
            </thead>
            <tbody>
              {blendResult.modelTrusts.map((m) => {
                const isEnabled = modelSwitches[m.modelId] !== false;
                const activeWeight = blendingStrategy === 'adaptive_skill' ? m.adaptiveWeight : m.equalWeight;
                return (
                  <tr key={m.modelId} style={{ opacity: isEnabled ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{m.shortName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {m.rawForecast.toFixed(1)} {currentVariable.unit}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: m.bias > 0 ? '#ef4444' : '#10b981' }}>
                      {m.bias >= 0 ? `+${m.bias.toFixed(2)}` : m.bias.toFixed(2)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#10b981' }}>
                      {m.calibratedForecast.toFixed(1)} {currentVariable.unit}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: m.color }}>
                      {isEnabled ? `${(activeWeight * 100).toFixed(1)}%` : '0%'}
                    </td>
                  </tr>
                );
              })}
              {blendResult.calibratedBlendedValue !== null && (
                <tr style={{ background: 'rgba(16, 185, 129, 0.08)', fontWeight: 600 }}>
                  <td style={{ color: '#10b981' }}>★ Dynamic Blend</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{blendResult.rawBlendedValue} {currentVariable.unit}</td>
                  <td>—</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                    {blendResult.calibratedBlendedValue.toFixed(2)} {currentVariable.unit}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>100.0%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <Activity size={16} style={{ color: '#10b981' }} />
              <span>Model Ingestion Health Matrix</span>
            </div>
            <span className="tag">Live Monitoring</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model Feed</th>
                <th>Freshness</th>
                <th>Switch</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {health.map((h, i) => {
                const isSwitchedOn = modelSwitches[h.source_id] !== false;
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{h.source_id.toUpperCase()}</td>
                    <td>{h.freshness}</td>
                    <td>
                      <span className={`status-badge ${isSwitchedOn ? 'healthy' : 'unavailable'}`}>
                        {isSwitchedOn ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${isSwitchedOn ? h.health_status : 'unavailable'}`}>
                        {isSwitchedOn ? h.health_status : 'user_disabled'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
