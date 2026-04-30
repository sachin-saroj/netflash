import { useState, useEffect } from 'react';

const getScoreColor = (score) => {
  if (score >= 7) return '#22C55E';
  if (score >= 4) return '#EAB308';
  return '#EF4444';
};

const getScoreLabel = (score) => {
  if (score >= 8) return 'Highly Trustworthy';
  if (score >= 7) return 'Trustworthy';
  if (score >= 5) return 'Moderately Trustworthy';
  if (score >= 4) return 'Mixed';
  if (score >= 2) return 'Suspicious';
  return 'Highly Suspicious';
};

export default function TrustScoreCard({ score, reviewCount }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!score) return;
    const duration = 1200;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.round(current * 10) / 10);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [score]);

  const color = getScoreColor(score || 0);

  return (
    <div className="card trust-score-card">
      <div className="section-label">TRUST SCORE</div>
      <div className="trust-score-number" style={{ color }}>
        {animatedScore.toFixed(1)}
        <span className="trust-score-suffix">/10</span>
      </div>
      <div className="trust-score-label" style={{ color }}>
        {getScoreLabel(score || 0)}
      </div>
      <div className="card-divider" />
      <div className="trust-score-meta">
        Based on {reviewCount?.toLocaleString() || 0} reviews analyzed
      </div>
    </div>
  );
}
