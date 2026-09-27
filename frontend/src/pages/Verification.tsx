/**
 * Verification Page — Step 5
 * Ministry of Earth Sciences (MoES) / NCMRWF Prototype
 *
 * Displays: CRPS (Gaussian closed-form), Brier Scores,
 * Reliability Diagram data, Coverage Diagnostics, and
 * Exponential Rolling Skill Monitor (lambda = 0.8).
 */

import { useMemo } from 'react';
import { useForecast } from '../context/ForecastContext';
import { calculateRecentSkill } from '../data/trustEngine';
import {
  computeCRPSForContext,
  computeReliabilityDiagram,
  computeCoverageForModel,
  computeRollingSkillForModel,
  computeTrustExplanations,
} from '../data/verificationEngine';
import { calculateModelErrorStd, getVariableThresholdPresets } from '../data/probabilisticEngine';
import {
  CheckCircle2,
  BarChart2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Target,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────

const TrendIcon = ({ direction }: { direction: 'improved' | 'degraded' | 'stable' }) => {
  if (direction === 'improved') return <TrendingDown size={14} style={{ color: '#10b981' }} />;
  if (direction === 'degraded') return <TrendingUp size={14} style={{ color: '#ef4444' }} />;
  return <Minus size={14} style={{ color: '#94a3b8' }} />;
};

interface ReliabilityBarProps {
  bins: { binCenter: number; meanForecastProb: number; observedFrequency: number; sampleCount: number }[];
}

const ReliabilityDiagramViz = ({ bins }: ReliabilityBarProps) => {
  // Simple visual: for each bin, show forecast prob vs observed freq as a mini bar chart
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          gap: 2,
          alignItems: 'flex-end',
          height: 80,
          padding: '0 4px',
          borderBottom: '1px solid #243452',
          position: 'relative',
        }}
      >
        {/* Perfect reliability diagonal reference */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            <line x1="0" y1="80" x2="100%" y2="0" stroke="#243452" strokeWidth="1" strokeDasharray="4,3" />
          </svg>
        </div>
        {bins.map((bin) => {
          const forecastH = Math.max(2, bin.meanForecastProb * 76);
          const observedH = Math.max(2, bin.observedFrequency * 76);
          return (
            <div
              key={bin.binCenter}
              style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1, position: 'relative' }}
              title={`P_f=${(bin.meanForecastProb * 100).toFixed(0)}% / P_obs=${(bin.observedFrequency * 100).toFixed(0)}% (n=${bin.sampleCount})`}
            >
              <div
                style={{
                  flex: 1,
                  height: forecastH,
                  background: 'rgba(6,182,212,0.6)',
                  borderRadius: '2px 2px 0 0',
                  minHeight: 2,
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: observedH,
                  background: 'rgba(16,185,129,0.8)',
                  borderRadius: '2px 2px 0 0',
                  minHeight: 2,
                }}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', padding: '0 4px' }}>
        <span>0%</span>
        <span>Forecast Probability →</span>
        <span>100%</span>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: '11px', color: '#94a3b8', marginTop: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'rgba(6,182,212,0.6)', borderRadius: 2, display: 'inline-block' }} />
          Forecast prob.
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'rgba(16,185,129,0.8)', borderRadius: 2, display: 'inline-block' }} />
          Observed freq.
        </span>
        <span style={{ color: '#475569' }}>| Dashed = perfect reliability</span>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────

export const Verification = () => {
  const { currentLocation, currentVariable, selectedLeadTime, models, brierScores, probabilisticBlend } =
    useForecast();

  // --- Compute per-model sigma ---
  const modelSigmas = useMemo(() => {
    const sigmas: Record<string, number> = {};
    for (const m of models) {
      sigmas[m.id] = calculateModelErrorStd(m.id, currentLocation.id, currentVariable.id, selectedLeadTime);
    }
    return sigmas;
  }, [models, currentLocation.id, currentVariable.id, selectedLeadTime]);

  // --- Step 3/4 base skill ---
  const modelVerifications = useMemo(
    () =>
      models.map((m) => ({
        ...m,
        stats: calculateRecentSkill(m.id, currentLocation.id, currentVariable.id, selectedLeadTime),
      })),
    [models, currentLocation.id, currentVariable.id, selectedLeadTime]
  );

  // --- Step 5: CRPS ---
  const crpsResults = useMemo(
    () => computeCRPSForContext(currentLocation.id, currentVariable.id, selectedLeadTime, modelSigmas),
    [currentLocation.id, currentVariable.id, selectedLeadTime, modelSigmas]
  );

  // --- Step 5: Reliability diagram (use first threshold preset) ---
  const thresholdPresets = useMemo(() => getVariableThresholdPresets(currentVariable.id), [currentVariable.id]);
  const reliabilityData = useMemo(
    () =>
      computeReliabilityDiagram(
        currentLocation.id,
        currentVariable.id,
        selectedLeadTime,
        thresholdPresets[0] ?? 10,
        probabilisticBlend.blendedSigma ?? 1.8,
        currentVariable.unit
      ),
    [currentLocation.id, currentVariable.id, selectedLeadTime, thresholdPresets, probabilisticBlend.blendedSigma, currentVariable.unit]
  );

  // --- Step 5: Coverage diagnostics ---
  const coverageResults = useMemo(
    () =>
      models.map((m) =>
        computeCoverageForModel(
          m.id,
          currentLocation.id,
          currentVariable.id,
          selectedLeadTime,
          modelSigmas[m.id] ?? 1.5
        )
      ),
    [models, currentLocation.id, currentVariable.id, selectedLeadTime, modelSigmas]
  );

  // --- Step 5: Rolling skill ---
  const rollingSkills = useMemo(
    () =>
      models.map((m) =>
        computeRollingSkillForModel(
          m.id,
          currentLocation.id,
          currentVariable.id,
          selectedLeadTime,
          modelSigmas[m.id] ?? 1.5
        )
      ),
    [models, currentLocation.id, currentVariable.id, selectedLeadTime, modelSigmas]
  );

  // --- Step 5: Trust explanations ---
  const trustExplanations = useMemo(
    () => computeTrustExplanations(rollingSkills, currentVariable.unit),
    [rollingSkills, currentVariable.unit]
  );

  const crpsByModel = useMemo(
    () => Object.fromEntries(crpsResults.map((c) => [c.modelId, c])),
    [crpsResults]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Banner ── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <CheckCircle2 size={18} style={{ color: '#10b981' }} />
            <span>Continuous Verification &amp; Statistical Skill Evaluation Engine</span>
          </div>
          <span className="tag" style={{ color: '#06b6d4' }}>
            DEMO / REPLAY VERIFICATION
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#94a3b8' }}>
          Statistical evaluation (MAE, RMSE, Bias, CRPS, Brier Score, Reliability, Coverage) computed from
          historical DEMO/REPLAY verification pairs for{' '}
          <strong style={{ color: '#f1f5f9' }}>{currentLocation.name}</strong> ({currentVariable.name},{' '}
          +{selectedLeadTime}h lead). Step 5 CRPS, Reliability &amp; Rolling Skill Active.
        </p>
      </div>

      <div className="notice-banner">
        <ShieldAlert size={18} />
        <div>
          <strong>Verification Notice:</strong> All metrics computed from the historical{' '}
          <strong>DEMO / REPLAY VERIFICATION</strong> stream using structured synthetic pairs.
          CRPS uses the Gaussian closed-form (Gneiting &amp; Raftery 2007). Reliability bins with
          small samples are explicitly flagged.
        </div>
      </div>

      {/* ── Step 5: Rolling Skill Monitor Cards ── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <Activity size={16} style={{ color: '#06b6d4' }} />
            <span>Exponential Rolling Skill Monitor (λ = {DECAY_LAMBDA})</span>
          </div>
          <span className="tag" style={{ color: '#06b6d4' }}>Step 5 Online Monitoring</span>
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: 12 }}>
          E_t = λ × E_(t-1) + (1 − λ) × L_t, where λ = {DECAY_LAMBDA}. More recent errors carry higher weight.
          Rolling CRPS uses Gaussian closed-form. All values from DEMO/REPLAY dataset.
        </p>
        <div className="grid-cols-3">
          {models.map((m, idx) => {
            const roll = rollingSkills[idx];
            const crps = crpsByModel[m.id];
            const expl = trustExplanations.find((e) => e.modelId === m.id);
            return (
              <div key={m.id} className="dash-card" style={{ borderColor: m.color }}>
                <div className="dash-card-header">
                  <span className="tag" style={{ color: m.color, fontWeight: 600 }}>
                    {m.shortName}
                  </span>
                  <span className="status-badge demo_replay">DEMO_REPLAY</span>
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 8 }}>{m.name}</h3>

                {/* Rolling MAE primary */}
                <div style={{ marginBottom: 8 }}>
                  <span className="card-subtitle">Rolling MAE (exp. weighted)</span>
                  <div className="card-value-lg" style={{ color: m.color, marginTop: 2 }}>
                    {roll.finalRollingMae.toFixed(3)}{' '}
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>{currentVariable.unit}</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: '12px',
                    color: '#94a3b8',
                    paddingTop: 10,
                    borderTop: '1px solid #243452',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rolling RMSE:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#06b6d4', fontWeight: 600 }}>
                      {roll.finalRollingRmse.toFixed(3)} {currentVariable.unit}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rolling Bias:</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: roll.finalRollingBias > 0 ? '#ef4444' : '#10b981',
                      }}
                    >
                      {roll.finalRollingBias >= 0
                        ? `+${roll.finalRollingBias.toFixed(3)}`
                        : roll.finalRollingBias.toFixed(3)}{' '}
                      {currentVariable.unit}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rolling CRPS:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#8b5cf6', fontWeight: 600 }}>
                      {roll.finalRollingCrps.toFixed(4)} {currentVariable.unit}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mean CRPS (batch):</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>
                      {crps ? crps.crpsMean.toFixed(4) : '—'} {currentVariable.unit}
                    </span>
                  </div>
                  {expl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <TrendIcon direction={expl.direction} />
                      <span
                        style={{
                          color:
                            expl.direction === 'improved'
                              ? '#10b981'
                              : expl.direction === 'degraded'
                                ? '#ef4444'
                                : '#94a3b8',
                          fontSize: '11px',
                        }}
                      >
                        {expl.direction === 'improved'
                          ? 'Recent skill improved'
                          : expl.direction === 'degraded'
                            ? 'Recent skill degraded'
                            : 'Skill stable'}
                      </span>
                    </div>
                  )}
                  {roll.note && (
                    <span style={{ fontSize: '10px', color: '#f59e0b', fontStyle: 'italic' }}>
                      ⚠ {roll.note.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step 5: Trust Change Explanations ── */}
      {trustExplanations.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <Sparkles size={16} style={{ color: '#10b981' }} />
              <span>Rolling-Skill Trust Weight Change Explanations</span>
            </div>
            <span className="tag" style={{ color: '#10b981' }}>Step 5 Explainability</span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: 12 }}>
            Adaptive weight changes are explained by comparing exponential rolling MAE (λ={DECAY_LAMBDA}) to simple average MAE.
            All evidence sourced from DEMO/REPLAY verification pairs.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trustExplanations.map((expl) => {
              const m = models.find((md) => md.id === expl.modelId);
              return (
                <div
                  key={expl.modelId}
                  style={{
                    background: '#131b2e',
                    border: '1px solid #243452',
                    borderLeft: `3px solid ${m?.color ?? '#06b6d4'}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <TrendIcon direction={expl.direction} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
                      {expl.explanation}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        gap: 16,
                        marginTop: 6,
                        fontSize: '11px',
                        color: '#64748b',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span>Rolling MAE: {expl.rollingMae.toFixed(3)}</span>
                      <span>Simple MAE: {expl.previousMae.toFixed(3)}</span>
                      <span>Trust: {expl.trustScore.toFixed(3)}</span>
                      <span>
                        Δw:{' '}
                        <span style={{ color: expl.weightDelta > 0 ? '#10b981' : expl.weightDelta < 0 ? '#ef4444' : '#94a3b8' }}>
                          {expl.weightDelta >= 0 ? `+${(expl.weightDelta * 100).toFixed(1)}%` : `${(expl.weightDelta * 100).toFixed(1)}%`}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 5: Reliability Diagram ── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <Target size={16} style={{ color: '#f59e0b' }} />
            <span>
              Reliability Diagram — {currentVariable.name} &gt; {reliabilityData.threshold}{' '}
              {reliabilityData.unit}
            </span>
          </div>
          <span className="tag" style={{ color: '#f59e0b' }}>Step 5 Reliability</span>
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: 12 }}>
          10 equal-width bins (0–100%) of forecast exceedance probability vs observed event frequency.
          Perfect reliability: bars aligned with dashed diagonal. n = {reliabilityData.totalSamples} total verification pairs.
          {reliabilityData.note && (
            <span style={{ color: '#f59e0b' }}> ⚠ {reliabilityData.note.replace(/_/g, ' ')}</span>
          )}
        </p>
        <ReliabilityDiagramViz bins={reliabilityData.bins} />

        {/* Reliability bin table */}
        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Bin</th>
                <th>Forecast Prob. Range</th>
                <th>Mean Forecast Prob.</th>
                <th>Observed Frequency</th>
                <th>Bias (Forecast − Observed)</th>
                <th>Sample Count</th>
              </tr>
            </thead>
            <tbody>
              {reliabilityData.bins.map((bin) => {
                const relBias = Number((bin.meanForecastProb - bin.observedFrequency).toFixed(4));
                return (
                  <tr key={bin.binCenter}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {(bin.binLower * 100).toFixed(0)}–{(bin.binUpper * 100).toFixed(0)}%
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                      {(bin.meanForecastProb * 100).toFixed(1)}%
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {(bin.meanForecastProb * 100).toFixed(1)}%
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                      {(bin.observedFrequency * 100).toFixed(1)}%
                    </td>
                    <td
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: Math.abs(relBias) < 0.05 ? '#10b981' : relBias > 0 ? '#ef4444' : '#f59e0b',
                      }}
                    >
                      {relBias >= 0 ? `+${(relBias * 100).toFixed(1)}%` : `${(relBias * 100).toFixed(1)}%`}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {bin.sampleCount > 0 ? (
                        `n = ${bin.sampleCount}`
                      ) : (
                        <span style={{ color: '#475569' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Step 5: Coverage Diagnostics ── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <Target size={16} style={{ color: '#3b82f6' }} />
            <span>Coverage &amp; Sharpness Diagnostics (50% / 80% / 90% Intervals)</span>
          </div>
          <span className="tag" style={{ color: '#3b82f6' }}>Step 5 Coverage</span>
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: 12 }}>
          Nominal vs observed coverage for Gaussian prediction intervals. Good calibration: observed ≈ nominal.
          Sharpness = mean interval width (smaller = more precise). All from DEMO/REPLAY pairs.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Nominal 50%</th>
              <th>Observed 50%</th>
              <th>Nominal 80%</th>
              <th>Observed 80%</th>
              <th>Nominal 90%</th>
              <th>Observed 90%</th>
              <th>Sharpness (90% width)</th>
            </tr>
          </thead>
          <tbody>
            {coverageResults.map((cov, idx) => {
              const m = models[idx];
              const c50 = cov.coverages.find((c) => c.nominalCoverage === 0.5);
              const c80 = cov.coverages.find((c) => c.nominalCoverage === 0.8);
              const c90 = cov.coverages.find((c) => c.nominalCoverage === 0.9);
              const coverageColor = (nominal: number, observed: number) => {
                const delta = Math.abs(observed - nominal);
                return delta <= 0.15 ? '#10b981' : delta <= 0.3 ? '#f59e0b' : '#ef4444';
              };
              return (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600, color: m.color }}>{m.shortName}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>50%</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: c50 ? coverageColor(0.5, c50.observedCoverage) : '#64748b' }}>
                    {c50 ? `${(c50.observedCoverage * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>80%</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: c80 ? coverageColor(0.8, c80.observedCoverage) : '#64748b' }}>
                    {c80 ? `${(c80.observedCoverage * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>90%</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: c90 ? coverageColor(0.9, c90.observedCoverage) : '#64748b' }}>
                    {c90 ? `${(c90.observedCoverage * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>
                    {c90 ? `±${(c90.meanIntervalWidth / 2).toFixed(2)} ${currentVariable.unit}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Probabilistic Threshold Brier Score Table ── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <Sparkles size={16} style={{ color: '#10b981' }} />
            <span>Probabilistic Threshold Skill (Brier Score Benchmark)</span>
          </div>
          <span className="tag" style={{ color: '#10b981' }}>Gaussian Predictive Verification</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Evaluation Threshold</th>
              <th>Target Variable</th>
              <th>Predictive Sigma (σ_blend)</th>
              <th>Brier Score (mean (p − o)²)</th>
              <th>Historical Samples</th>
              <th>Evaluation Quality</th>
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
                <td
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: b.brierScore < 0.15 ? '#10b981' : '#f59e0b',
                  }}
                >
                  {b.brierScore.toFixed(4)}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>n = {b.sampleCount}</td>
                <td>
                  <span className="tag" style={{ color: b.brierScore < 0.15 ? '#10b981' : '#f59e0b' }}>
                    {b.brierScore < 0.15 ? 'HIGH SKILL' : 'MODERATE SKILL'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Continuous Multi-Model Skill Matrix — now includes CRPS ── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">
            <BarChart2 size={16} style={{ color: '#06b6d4' }} />
            <span>Continuous Multi-Model Skill Matrix ({currentLocation.name})</span>
          </div>
          <span className="tag">Replay Stream</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Model Source</th>
              <th>Variable</th>
              <th>Lead Time</th>
              <th>MAE</th>
              <th>RMSE</th>
              <th>Mean Bias</th>
              <th>Exp. MAE (λ=0.8)</th>
              <th>CRPS (Gaussian)</th>
              <th>Data Status</th>
            </tr>
          </thead>
          <tbody>
            {modelVerifications.map((item) => {
              const crps = crpsByModel[item.id];
              return (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>{currentVariable.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>+{selectedLeadTime}h</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981' }}>
                    {item.stats.mae.toFixed(2)} {currentVariable.unit}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#06b6d4' }}>
                    {item.stats.rmse.toFixed(2)} {currentVariable.unit}
                  </td>
                  <td
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: item.stats.bias > 0 ? '#ef4444' : '#10b981',
                    }}
                  >
                    {item.stats.bias >= 0
                      ? `+${item.stats.bias.toFixed(2)}`
                      : item.stats.bias.toFixed(2)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {item.stats.expWeightedMae.toFixed(2)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#a78bfa' }}>
                    {crps && crps.sampleCount > 0 ? (
                      <>
                        {crps.crpsMean.toFixed(4)} {currentVariable.unit}
                        {crps.note && (
                          <span style={{ color: '#f59e0b', fontSize: '10px', marginLeft: 4 }}>⚠</span>
                        )}
                      </>
                    ) : (
                      <span className="tag" style={{ color: '#64748b' }}>No records</span>
                    )}
                  </td>
                  <td>
                    <span className="status-badge demo_replay">DEMO_REPLAY</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Re-export constant for use in JSX
const DECAY_LAMBDA = 0.8;
