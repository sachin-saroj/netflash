import { useState, useEffect } from 'react';
import { getYoutube } from '../services/api';

function formatViewCount(count) {
  if (!count || count === 0) return '0 views';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count} views`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function getSentimentColor(sentiment) {
  switch (sentiment) {
    case 'positive': return '#22C55E';
    case 'negative': return '#EF4444';
    case 'mixed': return '#EAB308';
    default: return '#8A8682';
  }
}

function getSentimentLabel(sentiment) {
  switch (sentiment) {
    case 'positive': return 'Positive';
    case 'negative': return 'Negative';
    case 'mixed': return 'Mixed';
    default: return 'Neutral';
  }
}

function VideoCard({ video }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="yt-video-card card"
    >
      <div className="yt-thumbnail-wrap">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="yt-thumbnail"
          loading="lazy"
        />
        {video.duration && (
          <span className="yt-duration font-mono">{video.duration}</span>
        )}
        {video.isSponsored && (
          <span className="yt-sponsored-badge">SPONSORED</span>
        )}
      </div>

      <div className="yt-video-info">
        <h3 className="yt-video-title">{video.title}</h3>
        <div className="yt-video-channel">{video.channelName}</div>
        <div className="yt-video-stats">
          <span>{formatViewCount(video.viewCount)}</span>
          <span>•</span>
          <span>{formatDate(video.publishedAt)}</span>
        </div>
        <div className="yt-video-sentiment">
          <span
            className="yt-sentiment-dot"
            style={{ background: getSentimentColor(video.sentiment) }}
          />
          <span
            className="yt-sentiment-label"
            style={{ color: getSentimentColor(video.sentiment) }}
          >
            {getSentimentLabel(video.sentiment)}
          </span>
        </div>
        {video.keyPoints && video.keyPoints.length > 0 && (
          <div className="yt-key-points">
            {video.keyPoints.slice(0, 2).map((point, i) => (
              <span key={i} className="yt-key-point">→ {point}</span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

export default function YoutubeSection({ productTitle }) {
  const [youtubeData, setYoutubeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productTitle) return;

    setLoading(true);
    getYoutube(productTitle)
      .then(res => {
        setYoutubeData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error?.message || 'YouTube analysis failed');
        setLoading(false);
      });
  }, [productTitle]);

  // Loading state
  if (loading) {
    return (
      <div className="card yt-section grid-row-full">
        <div className="section-label">YOUTUBE ANALYSIS</div>
        <p className="muted">Searching YouTube for reviews...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="card yt-section grid-row-full">
        <div className="section-label">YOUTUBE ANALYSIS</div>
        <p className="muted">{error}</p>
      </div>
    );
  }

  // No data or no videos
  if (!youtubeData || !youtubeData.videos || youtubeData.videos.length === 0) {
    return (
      <div className="card yt-section grid-row-full">
        <div className="section-label">YOUTUBE ANALYSIS</div>
        <p className="muted">No YouTube reviews found for this product.</p>
      </div>
    );
  }

  const { videos, analysis } = youtubeData;

  return (
    <div className="yt-section grid-row-full">
      <div className="yt-section-header">
        <div className="section-label">YOUTUBE ANALYSIS</div>
        {analysis && (
          <div className="yt-summary-bar">
            <span className="yt-summary-sentiment">
              <span
                className="yt-sentiment-dot"
                style={{ background: getSentimentColor(analysis.overallSentiment) }}
              />
              Overall: {getSentimentLabel(analysis.overallSentiment)}
            </span>
            {analysis.sponsoredCount > 0 && (
              <span className="yt-summary-sponsored">
                {analysis.sponsoredCount} of {videos.length} likely sponsored
              </span>
            )}
          </div>
        )}
      </div>

      {analysis?.summary && (
        <p className="yt-summary-text">{analysis.summary}</p>
      )}

      <div className="yt-video-grid">
        {videos.slice(0, 3).map(video => (
          <VideoCard key={video.videoId} video={video} />
        ))}
      </div>

      {videos.length > 3 && (
        <div className="yt-more-text">
          +{videos.length - 3} more video{videos.length - 3 > 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
}
