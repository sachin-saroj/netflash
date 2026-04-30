import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { analyzeProduct, getPrice } from '../services/api';
import LoadingState from '../components/LoadingState';
import TrustScoreCard from '../components/TrustScoreCard';
import PriceCard from '../components/PriceCard';
import ReviewBreakdown from '../components/ReviewBreakdown';
import AiVerdict from '../components/AiVerdict';
import ProductSummaryCard from '../components/ProductSummaryCard';
import YoutubeSection from '../components/YoutubeSection';
import PriceHistoryChart from '../components/PriceHistoryChart';
import SellerTrustCard from '../components/SellerTrustCard';
import AlternativesList from '../components/AlternativesList';

function ReviewRadarCard({ genuine, suspicious, incentivized }) {
  return (
    <div className="card review-radar-card">
      <div className="section-label">REVIEW RADAR</div>

      <div className="radar-bar-item">
        <div className="radar-bar-header">
          <span className="radar-bar-label">Suspicious</span>
          <span className="radar-bar-percent">{suspicious || 0}%</span>
        </div>
        <div className="bar-track">
          <div
            className="bar-fill bar-suspicious"
            style={{ width: `${suspicious || 0}%` }}
          />
        </div>
      </div>

      <div className="radar-bar-item">
        <div className="radar-bar-header">
          <span className="radar-bar-label">Incentivized</span>
          <span className="radar-bar-percent">{incentivized || 0}%</span>
        </div>
        <div className="bar-track">
          <div
            className="bar-fill bar-incentivized"
            style={{ width: `${incentivized || 0}%` }}
          />
        </div>
      </div>

      <div className="radar-bar-item">
        <div className="radar-bar-header">
          <span className="radar-bar-label">Genuine</span>
          <span className="radar-bar-percent">{genuine || 0}%</span>
        </div>
        <div className="bar-track">
          <div
            className="bar-fill bar-genuine"
            style={{ width: `${genuine || 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="error-state">
      <div className="error-icon">⚠</div>
      <h2 className="error-title">Analysis Failed</h2>
      <p className="error-message">{message || 'Something went wrong. Please try again.'}</p>
      <a href="/" className="btn-secondary">← Back to Home</a>
    </div>
  );
}

export default function Results({ user, onLoginClick }) {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [saved, setSaved] = useState(false);

  const url = searchParams.get('url');

  useEffect(() => {
    if (!url) {
      setStatus('error');
      setError('No URL provided');
      return;
    }

    analyzeProduct(url)
      .then(res => {
        setData(res.data);
        setStatus('done');

        // Kick off price comparison in parallel once we have product data
        const { product } = res.data;
        if (product?.id && product?.title) {
          getPrice(product.id, product.title, product.platform, product.currentPrice)
            .then(priceRes => setPriceData(priceRes.data))
            .catch(() => setPriceData(null));
        }
      })
      .catch(err => {
        setError(err.response?.data?.error?.message || 'Analysis failed. Please try again.');
        setStatus('error');
      });
  }, [url]);

  const handleSave = async () => {
    if (!user || !data) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: data.product.id,
          platform: data.product.platform,
          title: data.product.title,
          image: data.product.image,
          currentPrice: data.product.currentPrice,
          url: url
        })
      });
      
      const result = await res.json();
      if (result.success) {
        setSaved(true);
      }
    } catch (err) {
      console.error('Save failed');
    }
  };

  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState message={error} />;

  const { product, analysis } = data;

  return (
    <div className="results-page">
      {/* Product Header */}
      <div className="product-header card">
        {product.image && (
          <img src={product.image} alt={product.title} className="product-image" />
        )}
        <div className="product-info">
          <h1 className="product-title">{product.title}</h1>
          <div className="product-meta">
            <span>★ {product.rating}</span>
            <span>{product.reviewCount?.toLocaleString()} ratings</span>
            <span className="platform-badge">{product.platform}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {user ? (
            <button 
              onClick={handleSave} 
              disabled={saved}
              className="btn-secondary" 
              style={{ color: saved ? '#22C55E' : '#F5A623', borderColor: saved ? '#22C55E' : '#F5A623' }}
            >
              {saved ? '✓ Saved' : '⭐ Save'}
            </button>
          ) : (
            <button onClick={onLoginClick} className="btn-secondary" style={{ color: '#F5A623', borderColor: '#F5A623' }}>
              ⭐ Save
            </button>
          )}
          <a href="/" className="btn-secondary">New Search</a>
        </div>
      </div>

      {/* Row 1: Stat cards */}
      <div className="grid-row-3">
        <TrustScoreCard
          score={analysis.trustScore}
          reviewCount={analysis.reviewsAnalyzed}
        />
        <PriceCard mode="winner" data={priceData} />
        <ReviewRadarCard
          genuine={analysis.genuinePercent}
          suspicious={analysis.suspiciousPercent}
          incentivized={analysis.incentivizedPercent}
        />
      </div>

      {/* Row 2 */}
      <div className="grid-row-2">
        <PriceCard
          mode="full"
          data={priceData}
          productId={product.id}
          platform={product.platform}
          title={product.title}
        />
        <AiVerdict
          verdict={analysis.verdict}
          reviewCount={analysis.reviewsAnalyzed}
        />
      </div>

      {/* Row 2.5: Advanced Data */}
      {(product.priceHistory || analysis.sellerIntel) && (
        <div className="grid-row-2">
          {product.priceHistory && (
            <PriceHistoryChart data={product.priceHistory} currentPrice={product.currentPrice} />
          )}
          {analysis.sellerIntel && (
            <SellerTrustCard sellerIntel={analysis.sellerIntel} />
          )}
        </div>
      )}

      {/* Row 3: Product Summary */}
      {analysis.productSummary && (
        <div className="grid-row-full">
          <ProductSummaryCard summary={analysis.productSummary} />
        </div>
      )}

      {/* Row 4: Review Breakdown */}
      <ReviewBreakdown
        redFlags={analysis.redFlags}
        complaints={analysis.genuineComplaints}
        positives={analysis.genuinePositives}
      />

      {/* Row 5: Alternatives */}
      {analysis.alternatives && (
        <div className="grid-row-full">
          <AlternativesList alternatives={analysis.alternatives} />
        </div>
      )}

      {/* Row 6 */}
      <YoutubeSection productTitle={product.title} />
    </div>
  );
}
