export default function AiVerdict({ verdict, reviewCount }) {
  if (!verdict) {
    return (
      <div className="card ai-verdict-card">
        <div className="section-label">AI VERDICT</div>
        <p className="coming-soon-text">Not available</p>
      </div>
    );
  }

  // Parse verdict action from the first word
  const verdictUpper = verdict.toUpperCase();
  let actionColor = '#F0EDE8';
  let actionText = verdict;

  if (verdictUpper.startsWith('BUY')) {
    actionColor = '#22C55E';
    actionText = verdict;
  } else if (verdictUpper.startsWith('WAIT')) {
    actionColor = '#EAB308';
    actionText = verdict;
  } else if (verdictUpper.startsWith('AVOID')) {
    actionColor = '#EF4444';
    actionText = verdict;
  }

  // Split first sentence as the action header
  const firstSentenceEnd = verdict.indexOf('.');
  let actionLine, bodyText;
  if (firstSentenceEnd !== -1 && firstSentenceEnd < 60) {
    actionLine = verdict.slice(0, firstSentenceEnd + 1);
    bodyText = verdict.slice(firstSentenceEnd + 1).trim();
  } else {
    actionLine = verdict;
    bodyText = '';
  }

  return (
    <div className="card ai-verdict-card">
      <div className="section-label">AI VERDICT</div>
      <div className="ai-verdict-content">
        <div className="ai-verdict-action" style={{ color: actionColor }}>
          {actionLine}
        </div>
        {bodyText && (
          <div className="ai-verdict-text">{bodyText}</div>
        )}
      </div>
      <div className="ai-verdict-meta">
        Generated from analysis of {reviewCount?.toLocaleString() || 0} reviews
      </div>
    </div>
  );
}
