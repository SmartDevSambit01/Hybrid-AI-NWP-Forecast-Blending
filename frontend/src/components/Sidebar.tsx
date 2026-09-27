import {
  LayoutDashboard,
  CloudSun,
  Activity,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import type { ReactNode } from 'react';

export type NavTab = 'overview' | 'forecast' | 'health' | 'weights' | 'extreme' | 'verification';

interface NavItem {
  id: NavTab;
  label: string;
  icon: ReactNode;
}

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'forecast', label: 'Forecast Feeds', icon: <CloudSun size={18} /> },
    { id: 'health', label: 'Model Health', icon: <Activity size={18} /> },
    { id: 'weights', label: 'Model Weights', icon: <Sliders size={18} /> },
    { id: 'extreme', label: 'Extreme Events', icon: <AlertTriangle size={18} /> },
    { id: 'verification', label: 'Verification', icon: <CheckCircle2 size={18} /> },
  ];

  return (
    <aside className="sidebar">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => setActiveTab(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: '#06b6d4', fontWeight: 600 }}>
          <ShieldCheck size={14} />
          <span>STEP 1 SHELL</span>
        </div>
        <p>Operational Forecast Blending Prototype (SIH 2026).</p>
      </div>
    </aside>
  );
};
