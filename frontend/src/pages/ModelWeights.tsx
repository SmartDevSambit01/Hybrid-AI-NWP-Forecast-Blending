import { useForecast } from '../context/ForecastContext';
import { Sliders, HelpCircle, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export const ModelWeights = () => {
  const { blendResult, currentLocation, currentVariable, selectedLeadTime, blendingStrategy } = useForecast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Banner */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <Sliders size={18} style={{ color: '#06b6d4' }} />
            <span>Dynamic Multi-Model Trust & Weights Engine</span>
          </div>
          <span className="tag" style={{ color: blendingStrategy === 'adaptive_skill' ? '#10b981' : '#f59e0b' }}>
            {blendingStrategy === 'adaptive_skill' ? 'Strategy: Adaptive Recent Skill' : 'Strategy: Equal-Weight Baseline'}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#94a3b8' }}>
          Real-time dynamic trust weights derived from deterministic historical replay verification error. Weights reflect recent MAE skill across active models for{' '}
          <strong style={{ color: '#f1f5f9' }}>{currentLocation.name}</strong> ({currentVariable.name}, +{selectedLeadTime}h lead).
        </p>
      </div>

      {/* Zero Active Models Warning */}
      {blendResult.status === 'no_active_models' && (
        <div
          style={{
            padding: 16,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '13px',
          }}
        >
          <AlertCircle size={20} />
          <span>All forecast models are currently disabled. Weight allocation requires at least one active feed.</span>
        </div>
      )}

      {/* Dynamic Weight Cards */}
      <div className="grid-cols-3">
        {blendResult.modelTrusts.map((m) => {
          const activeWeight = blendingStrategy === 'adaptive_skill' ? m.adaptiveWeight : m.equalWeight;
          const weightPct = (activeWeight * 100).toFixed(1);

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
                <span className="tag" style={{ color: m.color, fontWeight: 600 }}>
                  {m.shortName}
                </span>
                <span className={`status-badge ${m.isActive ? 'healthy' : 'unavailable'}`}>
                  {m.isActive ? `WEIGHT: ${weightPct}%` : 'USER DISABLED'}
                </span>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{m.modelName}</h3>

              <div style={{ margin: '8px 0' }}>
                <span className="card-subtitle">
                  {blendingStrategy === 'adaptive_skill' ? 'Adaptive Normalized Trust Weight' : 'Equal Baseline Weight'}
                </span>
                <div
                  className="card-value-lg"
                  style={{ color: m.isActive ? m.color : '#64748b', marginTop: 4 }}
                >
                  {activeWeight.toFixed(3)}{' '}
                  <span style={{ fontSize: '14px', color: '#94a3b8' }}>({weightPct}%)</span>
                </div>
              </div>

              <div className="weight-bar-bg" style={{ height: 12 }}>
                <div
                  className="weight-segment"
                  style={{
                    width: `${activeWeight * 100}%`,
                    backgroundColor: m.isActive ? m.color : '#475569',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: '12px',
                  color: '#94a3b8',
                  paddingTop: 12,
                  borderTop: '1px solid #243452',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Recent Replay MAE:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#f1f5f9', fontWeight: 600 }}>
                    {m.mae.toFixed(2)} {currentVariable.unit} (n={m.sampleCount})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dynamic Trust Score:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: m.color, fontWeight: 600 }}>
                    {m.trustScore.toFixed(3)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>Bias Correction (μ):</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {m.bias >= 0 ? `+${m.bias.toFixed(2)}` : m.bias.toFixed(2)} {currentVariable.unit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Trust Mathematical Table & Explainability Card */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <Sparkles size={16} style={{ color: '#10b981' }} />
            <span>Multi-Model Verification Skill & Dynamic Trust Table</span>
          </div>
          <span className="tag" style={{ color: '#06b6d4' }}>
            DEMO / REPLAY VERIFICATION
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Model Source</th>
              <th>Status</th>
              <th>Recent MAE</th>
              <th>Sample Count (n)</th>
              <th>Dynamic Trust (1 / (ε + MAE))</th>
              <th>Adaptive Weight</th>
              <th>Equal Weight</th>
            </tr>
          </thead>
          <tbody>
            {blendResult.modelTrusts.map((m) => (
              <tr key={m.modelId} style={{ opacity: m.isActive ? 1 : 0.5 }}>
                <td style={{ fontWeight: 600 }}>{m.modelName}</td>
                <td>
                  <span className={`status-badge ${m.isActive ? 'healthy' : 'unavailable'}`}>
                    {m.isActive ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: m.isActive ? '#10b981' : '#64748b' }}>
                  {m.mae.toFixed(2)} {currentVariable.unit}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{m.sampleCount}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                  {m.trustScore.toFixed(4)}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981' }}>
                  {(m.adaptiveWeight * 100).toFixed(1)}% ({m.adaptiveWeight.toFixed(3)})
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                  {(m.equalWeight * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Explainability Callout */}
        <div
          style={{
            marginTop: 12,
            background: '#131b2e',
            border: '1px solid #243452',
            borderRadius: 8,
            padding: 14,
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>
            <HelpCircle size={16} />
            <span>Mathematical Trust Rationale:</span>
          </div>
          <p style={{ color: '#cbd5e1' }}>{blendResult.explanation}</p>
        </div>
      </div>

      {/* Specification Card */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <RefreshCw size={16} style={{ color: '#f59e0b' }} />
            <span>Mathematical Formulation Specification</span>
          </div>
          <span className="tag">Step 3 Dynamic Calibration</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>
          <p>
            • <strong style={{ color: '#f1f5f9' }}>Mean Bias Calibration:</strong> F_calibrated = F_raw - Bias, where Bias = (1/n) * Σ(Forecast - Observed).
          </p>
          <p>
            • <strong style={{ color: '#f1f5f9' }}>Dynamic Trust Formulation:</strong> Trust_i = 1 / (ε + MAE_i) with ε = 0.001. Models with lower recent verification error receive proportionally greater trust.
          </p>
          <p>
            • <strong style={{ color: '#f1f5f9' }}>Weight Normalization:</strong> Weight_i = Trust_i / Σ(Trust_active). Guarantees Σ Weight_i = 100.0% for operational consistency.
          </p>
        </div>
      </div>
    </div>
  );
};
