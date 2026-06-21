import axios from 'axios';

export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const analyzeProduct = async (url) => {
  const { data } = await axios.post(`${BASE}/api/analyze`, { url });
  return data;
};

export const getPrice = async (platformId, productTitle, platform, sourcePrice) => {
  const { data } = await axios.post(`${BASE}/api/price`, { platformId, productTitle, platform, sourcePrice });
  return data;
};

export const getYoutube = async (productTitle) => {
  const { data } = await axios.post(`${BASE}/api/youtube`, { productTitle });
  return data;
};
