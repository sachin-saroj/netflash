const axios = require('axios');
const { cleanReviews } = require('../utils/cleanReviews');
const { getMockProductDetails, getMockPrice } = require('../utils/mockData');
const logger = require('../utils/logger');

const RAPIDAPI_KEY = () => process.env.RAPIDAPI_KEY;
const FLIPKART_HOST = 'real-time-flipkart-data2.p.rapidapi.com';

/**
 * Fetch Flipkart product details + reviews by product ID.
 * Falls back to mock data because the API lacks a reviews endpoint.
 */
async function fetchFlipkartProductWithReviews(productId) {
  if (!RAPIDAPI_KEY()) {
    logger.warn('flipkart', 'RAPIDAPI_KEY not set, using mock data');
    return getMockProductDetails('flipkart', productId);
  }

  logger.info('flipkart', `Fetching Flipkart product: ${productId}`);

  try {
    // Attempt to fetch product details (often fails or returns 404 on this free API)
    const response = await axios.get(`https://${FLIPKART_HOST}/product`, {
      params: { pid: productId },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY(),
        'X-RapidAPI-Host': FLIPKART_HOST
      },
      timeout: 10000
    });

    const p = response.data;
    if (!p) throw new Error('No product data returned from Flipkart');

    // This API does NOT have a product-reviews endpoint, so we MUST throw 
    // to fallback to mock data to allow Gemini to work.
    throw new Error('API lacks reviews endpoint, falling back to mock data');
  } catch (err) {
    logger.info('flipkart', 'Using mock data for Flipkart due to API limitations', { error: err.message });
    return getMockProductDetails('flipkart', productId);
  }
}

/**
 * Search Flipkart for a product by title and return price data.
 */
async function fetchFlipkartPrice(productTitle) {
  if (!RAPIDAPI_KEY()) {
    return getMockPrice('flipkart', 800); // generic mock price
  }

  try {
    const searchQuery = productTitle
      .replace(/\(.*?\)/g, '')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .slice(0, 6)
      .join(' ')
      .trim();

    const response = await axios.get(`https://${FLIPKART_HOST}/products-search`, {
      params: { q: searchQuery, page: '1' },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY(),
        'X-RapidAPI-Host': FLIPKART_HOST
      },
      timeout: 10000
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

    return {
      platform: 'flipkart',
      price,
      mrp: mrp || null,
      title: match.title || match.product_name || productTitle,
      url: match.url || match.product_url || match.link || null,
      available: true
    };
  } catch (err) {
    // Return mock price if search fails or is disabled (401)
    logger.info('flipkart', 'Flipkart search failed/disabled, returning mock price');
    return getMockPrice('flipkart', Math.floor(Math.random() * 500) + 500); 
  }
}

module.exports = { fetchFlipkartProductWithReviews, fetchFlipkartPrice };
