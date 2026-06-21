import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE } from '../services/api';

export default function Dashboard({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchWatchlist = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BASE}/api/watchlist`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
          setItems(data.data);
        } else {
          setError('Failed to fetch watchlist');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, [user, navigate]);

  const handleRemove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE}/api/watchlist/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setItems(items.filter(item => item._id !== id));
      }
    } catch (err) {
      console.error('Failed to remove item');
    }
  };

  if (loading) return <div className="loading-page"><h2 className="loading-title">Loading Watchlist...</h2></div>;

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 24px', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: '32px', color: '#F0EDE8' }}>My Watchlist</h1>
        <div style={{ fontSize: '14px', color: '#8A8682' }}>{items.length} items saved</div>
      </div>

      {error && <div style={{ color: '#EF4444', marginBottom: '16px' }}>{error}</div>}

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👀</div>
          <h2 style={{ color: '#F0EDE8', marginBottom: '8px' }}>Your watchlist is empty</h2>
          <p style={{ color: '#8A8682', marginBottom: '24px' }}>Save products you want to monitor for price drops and changes.</p>
          <button onClick={() => navigate('/')} className="btn-secondary">Search Products</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {items.map(item => (
            <div key={item._id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                {item.image && (
                  <img src={item.image} alt="product" style={{ width: '60px', height: '60px', objectFit: 'contain', background: '#1E1E1E', borderRadius: '6px' }} />
                )}
                <div>
                  <h3 style={{ fontSize: '14px', color: '#F0EDE8', margin: '0 0 4px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.title}
                  </h3>
                  <span className="platform-badge" style={{ fontSize: '10px', background: '#3D2E10', color: '#F5A623', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    {item.platform}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #2A2A2A' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#8A8682', textTransform: 'uppercase' }}>Saved Price</div>
                  <div style={{ fontSize: '16px', fontFamily: 'JetBrains Mono', color: '#F0EDE8' }}>₹{item.savedPrice?.toLocaleString() || '---'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleRemove(item._id)}
                    style={{ background: 'transparent', border: '1px solid #3A3A3A', color: '#EF4444', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                  <button 
                    onClick={() => navigate(`/results?url=${encodeURIComponent(item.url)}`)}
                    style={{ background: '#F5A623', border: 'none', color: '#0F0F0F', fontWeight: '500', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Re-Analyze
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
