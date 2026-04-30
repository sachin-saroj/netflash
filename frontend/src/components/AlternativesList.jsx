import React from 'react';

export default function AlternativesList({ alternatives }) {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="card alternatives-card" style={{ gridColumn: '1 / -1' }}>
      <div className="section-label">SMART ALTERNATIVES</div>
      <p style={{ color: '#8A8682', fontSize: '14px', marginBottom: '16px' }}>
        Consider these better-rated or better-value options based on current market data:
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {alternatives.map((alt, index) => (
          <div key={index} style={{ background: '#1E1E1E', padding: '16px', borderRadius: '8px', border: '1px solid #2A2A2A', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '16px', color: '#F0EDE8', margin: 0, fontWeight: '600' }}>{alt.name}</h3>
              <span style={{ fontSize: '10px', background: '#3D2E10', color: '#F5A623', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                Alternative
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, lineHeight: '1.5' }}>
              {alt.reason}
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                style={{ background: 'transparent', border: '1px solid #3A3A3A', color: '#F0EDE8', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.target.style.background = '#2A2A2A'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                Search this product ↑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
