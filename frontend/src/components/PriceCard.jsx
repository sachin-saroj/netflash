import { useState, useEffect } from 'react';
import { getPrice } from '../services/api';

function formatPrice(price) {
  if (!price || price <= 0) return '—';
  return `₹${price.toLocaleString('en-IN')}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
}

export default function PriceCard({ mode, data, productId, platform, title }) {
  const [priceData, setPriceData] = useState(data || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // For mode="full", fetch price data on mount
  useEffect(() => {
    if (mode !== 'full' || !productId || !title) return;
    if (priceData?.prices?.length) return; // already have data

    setLoading(true);
    getPrice(productId, title, platform)
      .then(res => {
        setPriceData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error?.message || 'Price fetch failed');
        setLoading(false);
      });
  }, [mode, productId, title, platform]);

  // ── WINNER MODE (small stat card in row 1) ──
  if (mode === 'winner') {
    // If we have data passed from parent, show the winner
    if (data?.cheapestPlatform) {
      const cheapest = data.prices?.find(p => p.isCheapest);
      return (
        <div className="card price-card">
          <div className="section-label">PRICE WINNER</div>
          <div className="price-winner-platform">
            {capitalize(data.cheapestPlatform)}
          </div>
          <div className="price-winner-amount font-mono">
            {formatPrice(cheapest?.price)}
          </div>
          {data.savings > 0 && (
            <div className="price-winner-savings">
              Save ₹{data.savings.toLocaleString('en-IN')}
            </div>
          )}
        </div>
      );
    }

    // Loading or no data yet
    return (
      <div className="card price-card">
        <div className="section-label">PRICE WINNER</div>
        <p className="coming-soon-text">
          {loading ? 'Checking prices...' : 'Comparing prices across platforms...'}
        </p>
      </div>
    );
  }

  // ── FULL MODE (price comparison table in row 2) ──
  if (loading) {
    return (
      <div className="card price-card">
        <div className="section-label">PRICE COMPARISON</div>
        <div className="price-rows">
          {['Amazon', 'Flipkart', 'Meesho'].map(name => (
            <div key={name} className="price-row">
              <span className="price-platform">{name}</span>
              <span className="price-amount price-unavailable">Checking...</span>
            </div>
          ))}
        </div>
        <div className="price-meta">Fetching latest prices...</div>
      </div>
    );
  }

  if (error || !priceData) {
    return (
      <div className="card price-card">
        <div className="section-label">PRICE COMPARISON</div>
        <div className="price-rows">
          {['Amazon', 'Flipkart', 'Meesho'].map(name => (
            <div key={name} className="price-row">
              <span className="price-platform">{name}</span>
              <span className="price-amount price-unavailable">—</span>
            </div>
          ))}
        </div>
        <div className="price-meta">{error || 'Price comparison not available.'}</div>
      </div>
    );
  }

  const { prices, cheapestPlatform, savings, checkedAt } = priceData;
  const platformOrder = ['amazon', 'flipkart', 'meesho'];
  const sortedPrices = platformOrder.map(pName =>
    prices.find(p => p.platform === pName) || { platform: pName, price: null, available: false }
  );

  return (
    <div className="card price-card">
      <div className="section-label">PRICE COMPARISON</div>
      <div className="price-rows">
        {sortedPrices.map(p => {
          const isBest = p.isCheapest && p.available;
          return (
            <div
              key={p.platform}
              className={`price-row ${isBest ? 'price-row-best' : ''}`}
            >
              <span className={`price-platform ${!p.available ? 'price-unavailable' : ''}`}>
                {capitalize(p.platform)}
              </span>
              <span className={`price-amount ${!p.available ? 'price-unavailable' : ''}`}>
                {p.available ? formatPrice(p.price) : '—'}
              </span>
              {isBest && (
                <>
                  <span className="price-badge">CHEAPEST</span>
                  {savings > 0 && (
                    <span className="price-savings">
                      Save ₹{savings.toLocaleString('en-IN')}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="price-meta">
        Last checked: {timeAgo(checkedAt)}
      </div>
    </div>
  );
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
