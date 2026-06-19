import React, { useState } from 'react';
import { api } from '../services/api';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { email: formData.email, password: formData.password }
      : formData;

    try {
      // F-08 FIX: Replaced hardcoded 'http://localhost:5000' with centralized api instance.
      // Previously: fetch(`http://localhost:5000${endpoint}`, ...)
      // Now uses the shared axios instance from services/api.js which reads VITE_API_URL.
      const { data } = await api.post(endpoint, body);

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        onClose();
      } else {
        setError(data.error.message || 'Authentication failed');
      }
    } catch (err) {
      // Axios wraps error responses differently than fetch
      const message = err.response?.data?.error?.message || 'Network error. Please try again later.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', background: '#161616', padding: '32px', position: 'relative' }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', color: '#8A8682', fontSize: '20px' }}
        >
          ×
        </button>
        
        <h2 style={{ fontFamily: 'Syne', color: '#F0EDE8', marginBottom: '24px', fontSize: '24px' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div>
              <label htmlFor="name-input" style={{ display: 'block', fontSize: '12px', color: '#8A8682', marginBottom: '4px' }}>Name</label>
              <input 
                id="name-input"
                type="text" 
                required 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                style={{ width: '100%', background: '#1E1E1E', border: '1px solid #2A2A2A', padding: '10px 12px', color: '#F0EDE8', borderRadius: '6px', outline: 'none' }} 
              />
            </div>
          )}
          
          <div>
            <label htmlFor="email-input" style={{ display: 'block', fontSize: '12px', color: '#8A8682', marginBottom: '4px' }}>Email</label>
            <input 
              id="email-input"
              type="email" 
              required 
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', background: '#1E1E1E', border: '1px solid #2A2A2A', padding: '10px 12px', color: '#F0EDE8', borderRadius: '6px', outline: 'none' }} 
            />
          </div>

          <div>
            <label htmlFor="password-input" style={{ display: 'block', fontSize: '12px', color: '#8A8682', marginBottom: '4px' }}>Password</label>
            <input 
              id="password-input"
              type="password" 
              required 
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              style={{ width: '100%', background: '#1E1E1E', border: '1px solid #2A2A2A', padding: '10px 12px', color: '#F0EDE8', borderRadius: '6px', outline: 'none' }} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', background: '#F5A623', color: '#0F0F0F', fontWeight: '600', padding: '12px', borderRadius: '6px', marginTop: '8px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#8A8682', fontSize: '13px', marginTop: '24px' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            style={{ background: 'none', color: '#F5A623', fontWeight: '500' }}
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}
