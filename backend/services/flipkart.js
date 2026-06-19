const { cleanReviews } = require('../utils/cleanReviews');
const { getMockProductDetails, getMockPrice } = require('../utils/mockData');
const { createRapidApiClient, requestWithRetry } = require('./clients/rapidApi');
const logger = require('../utils/logger');

const FLIPKART_HOST = 'real-time-flipkart-data2.p.rapidapi.com';
const flipkartClient = createRapidApiClient(FLIPKART_HOST);

/**
 * Fetch Flipkart product details + reviews by product ID.
 * Since Flipkart RapidAPI lacks a reviews endpoint, this returns mock data directly.
 */
async function fetchFlipkartProductWithReviews(productId) {
  logger.info('flipkart', 'Serving mock Flipkart data (API lacks reviews endpoint)', {
    productId,
    source: 'mock'
  });
  return getMockProductDetails('flipkart', productId);
}

/**
 * Search Flipkart for a product by title and return price data.
 */
async function fetchFlipkartPrice(productTitle) {
  if (!process.env.RAPIDAPI_KEY) {
    logger.info('flipkart', 'Serving mock Flipkart price (RAPIDAPI_KEY not set)', { source: 'mock' });
    return getMockPrice('flipkart', 800, productTitle);
  }

  try {
    const searchQuery = productTitle
      .replace(/\(.*?\)/g, '')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .slice(0, 6)
      .join(' ')
      .trim();

    const response = await requestWithRetry(flipkartClient, {
      method: 'GET',
      url: '/products-search',
      params: { q: searchQuery, page: '1' }
    });

    const products = response.data?.products || response.data?.data || [];
    if (!products.length) throw new Error('No products found');

    const match = products.find(p => {
      const price = parseFloat(String(p.price || p.selling_price || '0').replace(/[₹,\s]/g, ''));
      return price > 0;
    });

    if (!match) throw new Error('No match with price found');

    const price = parseFloat(String(match.price || match.selling_price || '0').replace(/[₹,\s]/g, ''));
    const mrp = parseFloat(String(match.mrp || match.original_price || '0').replace(/[₹,\s]/g, ''));

    logger.info('flipkart', 'Returning live Flipkart price', { price, source: 'live' });

    return {
      platform: 'flipkart',
      price,
      mrp: mrp || null,
      title: match.title || match.product_name || productTitle,
      url: match.url || match.product_url || match.link || null,
      available: true
    };
  } catch (err) {
    logger.info('flipkart', 'Flipkart search failed, serving mock price', {
      error: err.message,
      source: 'mock'
    });
    return getMockPrice('flipkart', Math.floor(Math.random() * 500) + 500, productTitle); 
  }
}

/**
 * Fetch Flipkart price directly by product ID (ASIN equivalent).
 */
async function fetchFlipkartPriceById(productId, knownPrice) {
  if (knownPrice && knownPrice > 0) {
    return {
      platform: 'flipkart',
      price: knownPrice,
      title: '',
      url: null,
      available: true
    };
  }

  try {
    const response = await requestWithRetry(flipkartClient, {
      method: 'GET',
      url: '/product',
      params: { pid: productId }
    });

    const p = response.data;
    const price = parseFloat(String(p?.price || p?.selling_price || '0').replace(/[₹,\s]/g, ''));
    if (price <= 0) throw new Error('Invalid price');

    return {
      platform: 'flipkart',
      price,
      available: true
    };
  } catch (err) {
    logger.warn('flipkart', 'Flipkart direct price fetch failed, using mock data', { error: err.message });
    return getMockPrice('flipkart', Math.floor(Math.random() * 500) + 500, productId);
  }
}

module.exports = {
  fetchFlipkartProductWithReviews,
  fetchFlipkartPrice,
  fetchFlipkartPriceById
};
