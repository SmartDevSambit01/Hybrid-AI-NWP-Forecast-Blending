import { CloudRain, Activity, Clock } from 'lucide-react';

interface HeaderProps {
  systemStatus: string;
  dataMode: string;
  lastUpdate: string;
  isBackendConnected: boolean;
}

export const Header = ({
  systemStatus,
  dataMode,
  lastUpdate,
  isBackendConnected,
}: HeaderProps) => {
  return (
    <header className="header-bar">
      <div className="header-title-group">
        <div className="header-logo">
          <CloudRain size={22} />
        </div>
        <div className="header-titles">
          <h1>Hybrid AI–NWP Multi-Model Forecast Blending System</h1>
          <p>Ministry of Earth Sciences (MoES) / NCMRWF — Operational Intelligence Platform</p>
        </div>
      </div>

      <div className="header-status-group">
        <div className={`status-badge ${dataMode}`}>
          <span className="status-dot"></span>
          <span>{dataMode === 'demo_replay' ? 'DEMO / REPLAY STREAM' : systemStatus.toUpperCase()}</span>
        </div>

        <div className="timestamp-pill">
          <Activity size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: isBackendConnected ? '#10b981' : '#f59e0b' }} />
          <span>API: {isBackendConnected ? 'CONNECTED' : 'STANDALONE SHELL'}</span>
        </div>

        <div className="timestamp-pill">
          <Clock size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          <span>UTC {lastUpdate}</span>
        </div>
      </div>
    </header>
  );
};
