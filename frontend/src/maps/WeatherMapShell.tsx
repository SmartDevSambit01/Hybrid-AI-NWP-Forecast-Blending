import { MapPin, Navigation, Info } from 'lucide-react';

interface WeatherMapShellProps {
  title?: string;
}

export const WeatherMapShell = ({ title = "Operational Weather Domain — India Grid" }: WeatherMapShellProps) => {
  return (
    <div className="dash-card" style={{ height: '420px', padding: 16 }}>
      <div className="dash-card-header">
        <div className="dash-card-title">
          <Navigation size={16} style={{ color: '#06b6d4' }} />
          <span>{title}</span>
        </div>
        <div className="tag">LAT 28.61° N, LON 77.20° E (New Delhi Node)</div>
      </div>

      <div className="map-shell">
        <div className="map-grid-overlay" />

        <div style={{ zIndex: 2, textAlign: 'center', background: 'rgba(19, 27, 46, 0.85)', padding: '16px 24px', borderRadius: '10px', border: '1px solid #243452', maxWidth: '380px' }}>
          <MapPin size={28} style={{ color: '#06b6d4', margin: '0 auto 8px' }} />
          <h4 style={{ fontSize: '15px', color: '#f1f5f9', marginBottom: '4px' }}>Map Visualization Layer (Step 1 Shell)</h4>
          <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
            Map viewport initialized for NWP model comparison, gridded temperature, and extreme precipitation contours.
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <span className="tag" style={{ color: '#10b981' }}>NCUM 12km</span>
            <span className="tag" style={{ color: '#3b82f6' }}>NEPS 11-M</span>
            <span className="tag" style={{ color: '#8b5cf6' }}>AI Deep Learning</span>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 12, left: 16, zIndex: 2, display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: '#64748b' }}>
          <Info size={12} />
          <span>Raster visualization engine ready for GIS stream binding in Step 2.</span>
        </div>
      </div>
    </div>
  );
};
