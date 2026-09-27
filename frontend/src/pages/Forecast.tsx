import { useForecast } from '../context/ForecastContext';
import { CloudSun, BarChart3, AlertCircle } from 'lucide-react';

export const Forecast = () => {
  const {
    currentLocation,
    currentVariable,
    selectedLeadTime,
    blendingStrategy,
    probabilisticBlend,
  } = useForecast();

  const maxVal = Math.max(
    ...probabilisticBlend.models.map((m) => m.calibratedMean + m.predictiveSigma),
    (probabilisticBlend.blendedMean ?? 1) + (probabilisticBlend.blendedSigma ?? 1),
    10
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Target & Strategy Banner */}
      <div className="dash-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="card-subtitle">Active Forecast Target</span>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9', marginTop: 2 }}>
              {currentLocation.name} ({currentLocation.state}) — {currentVariable.name}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="tag" style={{ color: blendingStrategy === 'adaptive_skill' ? '#10b981' : '#f59e0b', fontSize: '12px', padding: '4px 10px' }}>
              {blendingStrategy === 'adaptive_skill' ? '★ Adaptive Recent Skill' : 'Equal-Weight Baseline'}
            </span>
            <span className="tag" style={{ color: '#06b6d4', fontSize: '12px', padding: '4px 10px' }}>
              +{selectedLeadTime}h Lead Time
            </span>
            <span className="status-badge demo_replay">DEMO_REPLAY</span>
          </div>
        </div>
      </div>

      {/* Probabilistic Forecast Hero & Prediction Intervals Card */}
      <div className="dash-card" style={{ border: '1px solid #10b981' }}>
        <div className="dash-card-header">
          <div className="dash-card-title">
            <CloudSun size={18} style={{ color: '#10b981' }} />
            <span>EMOS-Inspired Gaussian Predictive Distribution &amp; Uncertainty</span>
          </div>
          <span className="tag" style={{ color: '#10b981', fontWeight: 600 }}>
            {probabilisticBlend.disagreementLevel}
          </span>
        </div>

        {probabilisticBlend.status === 'no_active_models' ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <span>All models are disabled. Enable at least one feed to generate probabilistic forecast distribution.</span>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, margin: '8px 0 16px' }}>
              <div>
                <span className="card-subtitle">Expected Value (μ_blend)</span>
                <div className="card-value-lg" style={{ color: '#10b981', fontSize: '32px', marginTop: 4 }}>
                  {probabilisticBlend.blendedMean?.toFixed(2)}{' '}
                  <span style={{ fontSize: '14px', color: '#94a3b8' }}>{currentVariable.unit}</span>
                </div>
              </div>

              <div>
                <span className="card-subtitle">Total Uncertainty (σ_blend)</span>
                <div className="card-value-lg" style={{ color: '#06b6d4', fontSize: '32px', marginTop: 4 }}>
                  ±{probabilisticBlend.blendedSigma?.toFixed(2)}{' '}
                  <span style={{ fontSize: '14px', color: '#94a3b8' }}>{currentVariable.unit}</span>
                </div>
              </div>

              <div>
                <span className="card-subtitle">80% Prediction Interval</span>
                <div className="card-value-lg" style={{ color: '#f59e0b', fontSize: '20px', marginTop: 8 }}>
                  [{probabilisticBlend.interval80?.lower}, {probabilisticBlend.interval80?.upper}]
                </div>
              </div>

              <div>
                <span className="card-subtitle">90% Prediction Interval</span>
                <div className="card-value-lg" style={{ color: '#8b5cf6', fontSize: '20px', marginTop: 8 }}>
                  [{probabilisticBlend.interval90?.lower}, {probabilisticBlend.interval90?.upper}]
                </div>
              </div>
            </div>

            {/* Horizontal Prediction Interval Visualizer */}
            <div style={{ background: '#131b2e', padding: '14px 20px', borderRadius: 8, border: '1px solid #243452' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 8, color: '#94a3b8' }}>
                <span>90% Prediction Interval Range</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#f1f5f9' }}>
                  [{probabilisticBlend.interval90?.lower} {currentVariable.unit} — {probabilisticBlend.blendedMean} {currentVariable.unit} — {probabilisticBlend.interval90?.upper} {currentVariable.unit}]
                </span>
              </div>

              {/* Progress visualizer for intervals */}
              <div style={{ position: 'relative', height: 28, background: '#0b101d', borderRadius: 6, border: '1px solid #243452', overflow: 'hidden' }}>
                {/* 90% span */}
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    bottom: 4,
                    left: `${Math.max(0, ((probabilisticBlend.interval90?.lower ?? 0) / maxVal) * 100)}%`,
                    width: `${Math.min(100, (((probabilisticBlend.interval90?.upper ?? 10) - (probabilisticBlend.interval90?.lower ?? 0)) / maxVal) * 100)}%`,
                    background: 'rgba(139, 92, 246, 0.25)',
                    borderRadius: 4,
                    border: '1px solid rgba(139, 92, 246, 0.6)',
                  }}
                />
                {/* 50% span */}
                <div
                  style={{
                    position: 'absolute',
                    top: 7,
                    bottom: 7,
                    left: `${Math.max(0, ((probabilisticBlend.interval50?.lower ?? 0) / maxVal) * 100)}%`,
                    width: `${Math.min(100, (((probabilisticBlend.interval50?.upper ?? 10) - (probabilisticBlend.interval50?.lower ?? 0)) / maxVal) * 100)}%`,
                    background: 'rgba(16, 185, 129, 0.4)',
                    borderRadius: 3,
                  }}
                />
                {/* Mean marker */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${Math.max(0, ((probabilisticBlend.blendedMean ?? 0) / maxVal) * 100)}%`,
                    width: 3,
                    background: '#10b981',
                    boxShadow: '0 0 8px #10b981',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: 6 }}>
                <span>0.0 {currentVariable.unit}</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Expected Mean: {probabilisticBlend.blendedMean}</span>
                <span>{maxVal.toFixed(1)} {currentVariable.unit}</span>
              </div>
            </div>

            {/* Uncertainty Decomposition Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
              <div style={{ background: '#131b2e', padding: 10, borderRadius: 6, border: '1px solid #243452' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Within-Model Historical Error (σ_within):</span>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#06b6d4', marginTop: 2 }}>
                  ±{probabilisticBlend.withinModelSigma?.toFixed(2)} {currentVariable.unit}
                </div>
              </div>

              <div style={{ background: '#131b2e', padding: 10, borderRadius: 6, border: '1px solid #243452' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Between-Model Disagreement (σ_between):</span>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: 2 }}>
                  ±{probabilisticBlend.betweenModelSigma?.toFixed(2)} {currentVariable.unit}
                </div>
              </div>

              <div style={{ background: '#131b2e', padding: 10, borderRadius: 6, border: '1px solid #243452' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Active Model Spread (Std Dev):</span>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#8b5cf6', marginTop: 2 }}>
                  {probabilisticBlend.modelSpread?.toFixed(2)} {currentVariable.unit} ({probabilisticBlend.disagreementLevel})
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Model Probabilistic Comparison Cards */}
      <div className="grid-cols-3">
        {probabilisticBlend.models.map((m) => {
          const weightPct = (m.weight * 100).toFixed(1);

          return (
            <div
              key={m.modelId}
              className="dash-card"
              style={{
                opacity: m.isActive ? 1 : 0.55,
                borderColor: m.isActive ? m.color : '#243452',
                transition: 'all 0.2s ease',
              }}
            >
              <div className="dash-card-header">
                <span className="tag" style={{ color: m.color }}>
                  {m.shortName.toUpperCase()}
                </span>
                <span className={`status-badge ${m.isActive ? 'healthy' : 'unavailable'}`}>
                  {m.isActive ? `WEIGHT: ${weightPct}%` : 'USER DISABLED'}
                </span>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{m.modelName}</h3>

              <div style={{ margin: '6px 0' }}>
                <span className="card-subtitle">Calibrated Predictive Mean (μ)</span>
                <div className="card-value-lg" style={{ color: m.isActive ? m.color : '#64748b', marginTop: 4 }}>
                  {m.calibratedMean.toFixed(1)}{' '}
                  <span style={{ fontSize: '14px', color: '#94a3b8' }}>± {m.predictiveSigma.toFixed(2)} {currentVariable.unit}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '12px', color: '#94a3b8', paddingTop: 10, borderTop: '1px solid #243452' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>50% Interval:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#f1f5f9' }}>
                    [{m.interval50.lower}, {m.interval50.upper}]
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>80% Interval:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#f1f5f9' }}>
                    [{m.interval80.lower}, {m.interval80.upper}]
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>90% Interval:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#06b6d4', fontWeight: 600 }}>
                    [{m.interval90.lower}, {m.interval90.upper}]
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Spread Visualizer */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <BarChart3 size={18} style={{ color: '#3b82f6' }} />
            <span>Multi-Model Calibrated Forecast &amp; Predictive Uncertainty Spectrum</span>
          </div>
          <span className="tag">Deterministic Prediction Ranges</span>
        </div>

        <div className="chart-bar-container">
          {probabilisticBlend.models.map((m) => {
            const pct = maxVal > 0 ? (m.calibratedMean / maxVal) * 100 : 0;
            return (
              <div key={m.modelId} className="chart-bar-row" style={{ opacity: m.isActive ? 1 : 0.4 }}>
                <div className="chart-bar-label">
                  <span style={{ color: m.isActive ? '#f1f5f9' : '#64748b' }}>
                    {m.shortName} (90% Interval: [{m.interval90.lower}, {m.interval90.upper}]) {!m.isActive && '— [Disabled]'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: m.color }}>
                    {m.calibratedMean.toFixed(1)} ± {m.predictiveSigma.toFixed(2)} {currentVariable.unit}
                  </span>
                </div>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${Math.max(pct, 4)}%`,
                      backgroundColor: m.isActive ? m.color : '#475569',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
