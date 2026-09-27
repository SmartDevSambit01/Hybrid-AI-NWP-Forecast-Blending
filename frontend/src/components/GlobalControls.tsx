import { useForecast } from '../context/ForecastContext';
import { MapPin, Gauge, Clock, ToggleLeft, ToggleRight, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';

export const GlobalControls = () => {
  const {
    selectedLocation,
    selectedVariable,
    selectedLeadTime,
    blendingStrategy,
    modelSwitches,
    locations,
    variables,
    leadTimes,
    models,
    setSelectedLocation,
    setSelectedVariable,
    setSelectedLeadTime,
    setBlendingStrategy,
    toggleModel,
    resetAllModels,
    blendResult,
  } = useForecast();

  const allActive = Object.values(modelSwitches).every(Boolean);

  return (
    <div className="global-controls-panel">
      <div className="controls-header">
        <div className="controls-title">
          <SlidersHorizontal size={16} style={{ color: '#06b6d4' }} />
          <span>Operational Forecast Controls</span>
          <span className="tag" style={{ marginLeft: 8, fontSize: '10px' }}>
            DEMO REPLAY
          </span>
        </div>

        <div className="controls-status-summary">
          <span className="summary-chip">
            <strong>Strategy:</strong> {blendingStrategy === 'adaptive_skill' ? 'Adaptive Recent Skill' : 'Equal Baseline'}
          </span>
          <span className="summary-chip">
            <strong>Active:</strong> {blendResult.activeCount}/{blendResult.totalModels} Models
          </span>
          {!allActive && (
            <button className="reset-btn" onClick={resetAllModels} title="Reset all model switches to ON">
              <RotateCcw size={12} />
              <span>Reset Models</span>
            </button>
          )}
        </div>
      </div>

      <div className="controls-body">
        {/* Strategy Switcher */}
        <div className="control-group">
          <label className="control-label">
            <Sparkles size={12} style={{ color: '#10b981' }} />
            <span>BLENDING STRATEGY</span>
          </label>
          <select
            value={blendingStrategy}
            onChange={(e) => setBlendingStrategy(e.target.value as any)}
            className="control-select"
            style={{ borderColor: blendingStrategy === 'adaptive_skill' ? '#10b981' : '#243452' }}
          >
            <option value="adaptive_skill">★ Adaptive Recent Skill (Dynamic Trust)</option>
            <option value="equal_baseline">Equal-Weight Baseline (Step 2)</option>
          </select>
        </div>

        {/* Location Dropdown */}
        <div className="control-group">
          <label className="control-label">
            <MapPin size={12} style={{ color: '#06b6d4' }} />
            <span>LOCATION</span>
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="control-select"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.state})
              </option>
            ))}
          </select>
        </div>

        {/* Variable Dropdown */}
        <div className="control-group">
          <label className="control-label">
            <Gauge size={12} style={{ color: '#3b82f6' }} />
            <span>VARIABLE</span>
          </label>
          <select
            value={selectedVariable}
            onChange={(e) => setSelectedVariable(e.target.value)}
            className="control-select"
          >
            {variables.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.unit})
              </option>
            ))}
          </select>
        </div>

        {/* Lead Time Dropdown */}
        <div className="control-group">
          <label className="control-label">
            <Clock size={12} style={{ color: '#f59e0b' }} />
            <span>LEAD TIME</span>
          </label>
          <select
            value={selectedLeadTime}
            onChange={(e) => setSelectedLeadTime(Number(e.target.value))}
            className="control-select"
          >
            {leadTimes.map((lt) => (
              <option key={lt} value={lt}>
                +{lt} Hours ({lt / 24 >= 1 ? `${lt / 24}d` : `${lt}h`})
              </option>
            ))}
          </select>
        </div>

        {/* Model ON/OFF Switches */}
        <div className="control-group models-toggle-group">
          <label className="control-label">
            <span>MODEL FEEDS</span>
          </label>
          <div className="model-switches-row">
            {models.map((m) => {
              const isOn = modelSwitches[m.id] !== false;
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`model-toggle-btn ${isOn ? 'on' : 'off'}`}
                  style={{
                    borderColor: isOn ? m.color : '#243452',
                  }}
                  title={`Toggle ${m.name} ${isOn ? 'OFF' : 'ON'}`}
                >
                  <span
                    className="model-color-dot"
                    style={{ backgroundColor: isOn ? m.color : '#64748b' }}
                  />
                  <span className="model-toggle-name">{m.shortName}</span>
                  {isOn ? (
                    <ToggleRight size={16} style={{ color: m.color }} />
                  ) : (
                    <ToggleLeft size={16} style={{ color: '#64748b' }} />
                  )}
                  <span className={`toggle-state-badge ${isOn ? 'active' : 'inactive'}`}>
                    {isOn ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
