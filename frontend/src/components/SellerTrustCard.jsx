import React from 'react';

export default function SellerTrustCard({ sellerIntel }) {
  if (!sellerIntel) return null;

  const { riskLevel, redFlags } = sellerIntel;
  
  let riskColor = '#F0EDE8';
  let badgeColor = '#3A3A3A';
  let icon = 'ℹ️';

  if (riskLevel?.toLowerCase() === 'safe') {
    riskColor = '#22C55E';
    badgeColor = 'rgba(34, 197, 94, 0.15)';
    icon = '✅';
  } else if (riskLevel?.toLowerCase() === 'caution') {
    riskColor = '#EAB308';
    badgeColor = 'rgba(234, 179, 8, 0.15)';
    icon = '⚠️';
  } else if (riskLevel?.toLowerCase() === 'avoid') {
    riskColor = '#EF4444';
    badgeColor = 'rgba(239, 68, 68, 0.15)';
    icon = '🚨';
  }

  return (
    <div className="card seller-trust-card">
      <div className="section-label">SELLER REPUTATION</div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ fontSize: '24px' }}>{icon}</div>
        <div>
          <div style={{ fontSize: '11px', color: '#8A8682', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Level</div>
          <div style={{ color: riskColor, fontWeight: '700', fontSize: '18px', textTransform: 'uppercase' }}>
            {riskLevel}
          </div>
        </div>
      </div>

      {redFlags && redFlags.length > 0 ? (
        <div style={{ background: '#1E1E1E', borderRadius: '8px', padding: '12px', border: '1px solid #2A2A2A' }}>
          <div style={{ fontSize: '12px', color: '#8A8682', marginBottom: '8px', fontWeight: '500' }}>KNOWN ISSUES</div>
          <ul style={{ margin: 0, paddingLeft: '16px', color: '#F0EDE8', fontSize: '13px', lineHeight: '1.6' }}>
            {redFlags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div style={{ background: '#1E1E1E', borderRadius: '8px', padding: '12px', border: '1px solid #2A2A2A', color: '#8A8682', fontSize: '13px' }}>
          No major seller red flags detected.
        </div>
      )}
    </div>
  );
}
