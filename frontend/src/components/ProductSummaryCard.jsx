export default function ProductSummaryCard({ summary }) {
  if (!summary || typeof summary === 'string') {
    // Fallback if the AI returns a string (old format)
    return (
      <div className="card product-summary-card" style={{ gridColumn: '1 / -1' }}>
        <div className="section-label">AI PRODUCT SUMMARY</div>
        <div className="product-summary-content" style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#a1a1aa' }}>
          {summary.overview || summary}
        </div>
      </div>
    );
  }

  // Helper to colorize metrics
  const getMetricColor = (val) => {
    const v = val.toLowerCase();
    if (v.includes('excellent') || v.includes('great') || v.includes('good')) return '#22C55E';
    if (v.includes('average') || v.includes('decent') || v.includes('fair')) return '#EAB308';
    if (v.includes('poor') || v.includes('bad') || v.includes('terrible')) return '#EF4444';
    return '#8A8682'; // unknown
  };

  return (
    <div className="card product-summary-card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="section-label">DEEP-DIVE INTEL</div>
      
      {/* Overview Paragraph */}
      <div className="product-summary-content" style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#F0EDE8', borderLeft: '3px solid #F5A623', paddingLeft: '16px' }}>
        {summary.overview}
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '8px' }}>
        
        <div style={{ background: '#1E1E1E', padding: '12px 16px', borderRadius: '8px', border: '1px solid #2A2A2A' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8A8682', marginBottom: '4px' }}>Build Quality</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: getMetricColor(summary.buildQuality) }}>
            {summary.buildQuality}
          </div>
        </div>

        <div style={{ background: '#1E1E1E', padding: '12px 16px', borderRadius: '8px', border: '1px solid #2A2A2A' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8A8682', marginBottom: '4px' }}>Value For Money</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: getMetricColor(summary.valueForMoney) }}>
            {summary.valueForMoney}
          </div>
        </div>

        <div style={{ background: '#1E1E1E', padding: '12px 16px', borderRadius: '8px', border: '1px solid #2A2A2A' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8A8682', marginBottom: '4px' }}>Performance</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: getMetricColor(summary.performance) }}>
            {summary.performance}
          </div>
        </div>

      </div>

      {/* Target Audience */}
      {summary.targetAudience && (
        <div style={{ marginTop: '4px', fontSize: '13px', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#F5A623' }}></span>
          <strong>Best For:</strong> {summary.targetAudience}
        </div>
      )}
    </div>
  );
}
