export default function ReviewBreakdown({ redFlags, complaints, positives }) {
  const safeRedFlags = redFlags?.length ? redFlags : ['Not available'];
  const safeComplaints = complaints?.length ? complaints : ['Not available'];
  const safePositives = positives?.length ? positives : ['Not available'];

  return (
    <div className="card review-breakdown-card grid-row-full">
      <div className="section-label">REVIEW ANALYSIS</div>

      <div className="review-breakdown-columns">
        <div>
          <div className="review-column-label">RED FLAGS</div>
          <ul className="review-bullet-list">
            {safeRedFlags.map((item, i) => (
              <li key={i} className="review-bullet-item">{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="review-column-label">GENUINE COMPLAINTS</div>
          <ul className="review-bullet-list">
            {safeComplaints.map((item, i) => (
              <li key={i} className="review-bullet-item">{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="review-positives-section">
        <div className="review-column-label">WHAT REAL BUYERS LIKED</div>
        <ul className="review-bullet-list">
          {safePositives.map((item, i) => (
            <li key={i} className="review-bullet-item">{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
