import { useForecast } from '../context/ForecastContext';
import { AlertTriangle, ShieldCheck, Gauge, Layers, Info, CheckCircle2 } from 'lucide-react';

export const ExtremeEvents = () => {
  const {
    currentLocation,
    currentVariable,
    selectedLeadTime,
    selectedThreshold,
    setSelectedThreshold,
    probabilisticBlend,
    thresholdExceedanceCards,
    selectedThresholdResult,
    brierScores,
  } = useForecast();

  const getClassificationColor = (cls: string) => {
    switch (cls) {
      case 'Low':
        return '#10b981';
      case 'Moderate':
        return '#f59e0b';
      case 'High':
        return '#f97316';
      case 'Very High':
        return '#ef4444';
      default:
        return '#06b6d4';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Banner */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
            <span>Probabilistic Threshold Exceedance & Extreme Event Decision Support</span>
          </div>
          <span className="tag" style={{ color: '#06b6d4' }}>
            DEMO / REPLAY PROTOTYPE
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#94a3b8' }}>
          Real-time Gaussian predictive exceedance evaluation P(Y &gt; Threshold) calculated from the calibrated multi-model blend for{' '}
          <strong style={{ color: '#f1f5f9' }}>{currentLocation.name}</strong> ({currentVariable.name}, +{selectedLeadTime}h lead).
        </p>
      </div>

      {/* Target Context Summary */}
      <div className="notice-banner warning">
        <Info size={18} />
        <div>
          <strong>Operational Notice:</strong> Threshold levels and probability bands displayed here are demonstration prototype triggers. They are not official statutory NCMRWF / IMD disaster warning levels.
        </div>
      </div>

      {/* Active Threshold Hero Card + Disagreement Summary */}
      <div className="grid-cols-3">
        {/* Hero Exceedance Card */}
        <div className="dash-card" style={{ gridColumn: 'span 2', borderColor: getClassificationColor(selectedThresholdResult.classification) }}>
          <div className="dash-card-header">
            <div className="dash-card-title">
              <Gauge size={16} style={{ color: getClassificationColor(selectedThresholdResult.classification) }} />
              <span>Target Exceedance Probability: &gt; {selectedThreshold} {currentVariable.unit}</span>
            </div>
            <span
              className="tag"
              style={{
                backgroundColor: `${getClassificationColor(selectedThresholdResult.classification)}22`,
                borderColor: getClassificationColor(selectedThresholdResult.classification),
                color: getClassificationColor(selectedThresholdResult.classification),
                fontWeight: 700,
              }}
            >
              {selectedThresholdResult.classification.toUpperCase()} PROBABILITY
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, margin: '10px 0' }}>
            <div className="card-value-lg" style={{ color: getClassificationColor(selectedThresholdResult.classification), fontSize: '42px' }}>
              {selectedThresholdResult.probabilityPercent}%
            </div>
            <span className="card-subtitle">
              P(Forecast &gt; {selectedThreshold} {currentVariable.unit})
            </span>
          </div>

          {/* Probability Progress Bar */}
          <div className="weight-bar-bg" style={{ height: 16, borderRadius: 8 }}>
            <div
              className="weight-segment"
              style={{
                width: `${selectedThresholdResult.probabilityPercent}%`,
                backgroundColor: getClassificationColor(selectedThresholdResult.classification),
              }}
            />
          </div>

          {/* Distribution Parameters Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid #243452', fontSize: '12px' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Predictive Mean (μ):</span>
              <div style={{ fontFamily: 'var(--font-mono)', color: '#f1f5f9', fontWeight: 600, marginTop: 2 }}>
                {selectedThresholdResult.predictiveMean.toFixed(2)} {currentVariable.unit}
              </div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Predictive Sigma (σ):</span>
              <div style={{ fontFamily: 'var(--font-mono)', color: '#06b6d4', fontWeight: 600, marginTop: 2 }}>
                ±{selectedThresholdResult.predictiveSigma.toFixed(2)} {currentVariable.unit}
              </div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Formula State:</span>
              <div style={{ fontFamily: 'var(--font-mono)', color: '#cbd5e1', marginTop: 2 }}>
                1 - Φ(({selectedThreshold} - {selectedThresholdResult.predictiveMean.toFixed(1)}) / {selectedThresholdResult.predictiveSigma.toFixed(1)})
              </div>
            </div>
          </div>
        </div>

        {/* Prototype Probability Bands Reference */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <Layers size={16} style={{ color: '#06b6d4' }} />
              <span>Prototype Probability Bands</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '12px' }}>
            {[
              { band: '< 20%', label: 'Low', color: '#10b981', desc: 'Minimal exceedance likelihood.' },
              { band: '20% – 50%', label: 'Moderate', color: '#f59e0b', desc: 'Moderate potential for threshold breach.' },
              { band: '50% – 80%', label: 'High', color: '#f97316', desc: 'High likelihood of surpassing threshold.' },
              { band: '> 80%', label: 'Very High', color: '#ef4444', desc: 'Imminent high-confidence exceedance.' },
            ].map((b) => (
              <div key={b.label} style={{ background: '#131b2e', padding: 8, borderRadius: 6, border: '1px solid #243452' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: b.color, fontWeight: 700 }}>{b.label} ({b.band})</span>
                  {selectedThresholdResult.classification === b.label && (
                    <span className="tag" style={{ color: b.color, fontSize: '9px' }}>CURRENT</span>
                  )}
                </div>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preset Threshold Cards */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <ShieldCheck size={16} style={{ color: '#10b981' }} />
            <span>Multi-Threshold Spectrum ({currentVariable.name})</span>
          </div>
          <span className="tag">Click any card to select threshold</span>
        </div>

        <div className="grid-cols-4">
          {thresholdExceedanceCards.map((c) => {
            const isSelected = selectedThreshold === c.threshold;
            const color = getClassificationColor(c.classification);

            return (
              <div
                key={c.threshold}
                onClick={() => setSelectedThreshold(c.threshold)}
                style={{
                  background: isSelected ? '#1e2a45' : '#131b2e',
                  border: isSelected ? `2px solid ${color}` : '1px solid #243452',
                  borderRadius: 8,
                  padding: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                    &gt; {c.threshold} {c.unit}
                  </span>
                  <span
                    className="tag"
                    style={{
                      color,
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {c.classification}
                  </span>
                </div>

                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color, margin: '8px 0 4px' }}>
                  {c.probabilityPercent}%
                </div>

                <div className="weight-bar-bg" style={{ height: 6 }}>
                  <div className="weight-segment" style={{ width: `${c.probabilityPercent}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Brier Score Verification Card */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <CheckCircle2 size={16} style={{ color: '#06b6d4' }} />
            <span>Historical Probability Verification (Brier Score Benchmark)</span>
          </div>
          <span className="tag">Replay Verification Stream</span>
        </div>

        <p style={{ fontSize: '13px', color: '#94a3b8' }}>
          Standard Brier Score Brier = (1/n) * Σ(p_k - o_k)² evaluated across historical replay observation pairs (lower is better, 0.00 = perfect).
        </p>

        <table className="data-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Threshold Level</th>
              <th>Variable</th>
              <th>Predictive Sigma</th>
              <th>Brier Score</th>
              <th>Historical Samples</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {brierScores.map((b) => (
              <tr key={b.threshold}>
                <td style={{ fontWeight: 700, color: '#f1f5f9' }}>
                  &gt; {b.threshold} {b.unit}
                </td>
                <td>{currentVariable.name}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  ±{probabilisticBlend.blendedSigma?.toFixed(2) ?? '1.50'} {currentVariable.unit}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: b.brierScore < 0.15 ? '#10b981' : '#f59e0b' }}>
                  {b.brierScore.toFixed(4)}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>n = {b.sampleCount}</td>
                <td>
                  <span className="status-badge demo_replay">DEMO_REPLAY</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
