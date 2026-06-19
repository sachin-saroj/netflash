import axios from 'axios';

/**
 * F-08 FIX: Centralized API base URL configuration.
 *
 * This is the SINGLE SOURCE OF TRUTH for the backend API URL.
 * All frontend components must use the exported `api` axios instance
 * or the `API_BASE_URL` constant instead of hardcoding 'http://localhost:5000'.
 *
 * - Development: Set VITE_API_URL=http://localhost:5000 in frontend/.env
 * - Production:  Set VITE_API_URL=https://api.netflash.app in frontend/.env
 *
 * The fallback to localhost:5000 only exists for zero-config local development.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Pre-configured axios instance with the correct base URL.
 * Use this for any API calls that need custom headers (e.g., auth token).
 *
 * Usage:
 *   import { api, API_BASE_URL } from '../services/api';
 *   const res = await api.get('/api/watchlist', { headers: { Authorization: `Bearer ${token}` } });
 */
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically inject JWT token into authorization header if it exists in local storage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export { API_BASE_URL, api };


export const analyzeProduct = async (url) => {
  const { data } = await api.post('/api/analyze', { url });
  return data;
};

export const getPrice = async (platformId, productTitle, platform, sourcePrice) => {
  const { data } = await api.post('/api/price', { platformId, productTitle, platform, sourcePrice });
  return data;
};

export const getYoutube = async (productTitle) => {
  const { data } = await api.post('/api/youtube', { productTitle });
  return data;
};
