import type { ModelHealth as ModelHealthType, SystemConfig } from '../types';
import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import type { NavTab } from '../components/Sidebar';
import { Overview } from '../pages/Overview';
import { Forecast } from '../pages/Forecast';
import { ModelHealth } from '../pages/ModelHealth';
import { ModelWeights } from '../pages/ModelWeights';
import { ExtremeEvents } from '../pages/ExtremeEvents';
import { Verification } from '../pages/Verification';
import { apiService } from '../services/api';
import { GlobalControls } from '../components/GlobalControls';

export const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [health, setHealth] = useState<ModelHealthType[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString().slice(11, 19));

  useEffect(() => {
    let isMounted = true;
    async function loadAllData() {
      const [cfgRes, healthRes] = await Promise.all([
        apiService.getConfig(),
        apiService.getModelHealth(),
      ]);

      if (isMounted) {
        setIsBackendConnected(cfgRes.isLive);
        setConfig(cfgRes.data);
        setHealth(healthRes.data);
        setLastUpdate(new Date().toISOString().slice(11, 19));
      }
    }

    loadAllData();
    const interval = setInterval(loadAllData, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app-container">
      <Header
        systemStatus={config?.data_mode === 'demo_replay' ? 'demo_replay' : 'healthy'}
        dataMode={config?.data_mode || 'demo_replay'}
        lastUpdate={lastUpdate}
        isBackendConnected={isBackendConnected}
      />

      <div className="dashboard-layout">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="main-viewport">
          <GlobalControls />

          {activeTab === 'overview' && (
            <Overview
              health={health}
              dataMode={config?.data_mode || 'demo_replay'}
            />
          )}
          {activeTab === 'forecast' && <Forecast />}
          {activeTab === 'health' && <ModelHealth healthList={health} />}
          {activeTab === 'weights' && <ModelWeights />}
          {activeTab === 'extreme' && <ExtremeEvents />}
          {activeTab === 'verification' && <Verification />}
        </main>
      </div>
    </div>
  );
};
