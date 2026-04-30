const axios = require('axios');
const { cleanReviews } = require('../utils/cleanReviews');
const { getMockProductDetails, getMockPrice } = require('../utils/mockData');
const logger = require('../utils/logger');

const RAPIDAPI_KEY = () => process.env.RAPIDAPI_KEY;
const MEESHO_HOST = 'meesho-price-history-tracker4.p.rapidapi.com';

/**
 * Fetch Meesho product details + reviews by product ID.
 * This API uses POST with product URL (not GET with ID).
 * Falls back to mock data because the API only provides price history, not reviews.
 */
async function fetchMeeshoProductWithReviews(productId, originalUrl) {
  if (!RAPIDAPI_KEY()) {
    logger.warn('meesho', 'RAPIDAPI_KEY not set, using mock data');
    return getMockProductDetails('meesho', productId);
  }

  logger.info('meesho', `Fetching Meesho product: ${productId}`);

  // Use the original URL if available, otherwise construct one
  const productUrl = originalUrl && originalUrl.includes('meesho.com')
    ? originalUrl
    : `https://www.meesho.com/product/p/${productId}`;

  try {
    // This API takes a product URL via POST form-data, but ONLY returns price history.
    // It doesn't return title, image, or reviews which we need for analysis.
    const response = await axios.post(
      `https://${MEESHO_HOST}/meesho.php`,
      `url=${encodeURIComponent(productUrl)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-RapidAPI-Key': RAPIDAPI_KEY(),
          'X-RapidAPI-Host': MEESHO_HOST
        },
        timeout: 10000
      }
    );

    const data = response.data;
    if (!data) throw new Error('No product data returned from Meesho');

    // Since this API only has price history, throw to trigger mock fallback for reviews
    throw new Error('API lacks reviews endpoint, falling back to mock data');

  } catch (err) {
    logger.info('meesho', 'Using mock data for Meesho due to API limitations', { error: err.message });
    return getMockProductDetails('meesho', productId);
  }
}

/**
 * Fetch Meesho price for a product URL (used in price comparison).
 */
async function fetchMeeshoPrice(productTitle, knownPrice) {
  if (knownPrice) {
    return getMockPrice('meesho', knownPrice);
  }
  return getMockPrice('meesho', Math.floor(Math.random() * 500) + 500);
}

/**
 * Fetch Meesho price by URL (used when source is Meesho).
 */
async function fetchMeeshoPriceByUrl(productUrl) {
  if (!RAPIDAPI_KEY()) return getMockPrice('meesho', 800);

  try {
    const response = await axios.post(
      `https://${MEESHO_HOST}/meesho.php`,
      `url=${encodeURIComponent(productUrl)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-RapidAPI-Key': RAPIDAPI_KEY(),
          'X-RapidAPI-Host': MEESHO_HOST
        },
        timeout: 10000
      }
    );

    const data = response.data;
    // The Meesho price tracker API returns an array: `[{"averageprice":294.57,"highprice":310,...}]`
    let price = 0;
    if (Array.isArray(data) && data.length > 0) {
      price = data[0].averageprice || data[0].lowestprice || 0;
    } else {
      price = parseFloat(String(data?.price || data?.current_price || '0').replace(/[₹,\s]/g, ''));
    }

    if (price <= 0) throw new Error('Invalid price from Meesho API');

    return {
      platform: 'meesho',
      price,
      title: 'Meesho Product',
      url: productUrl,
      available: price > 0
    };
  } catch (err) {
    logger.warn('meesho', 'Meesho price by URL failed, using mock data', { error: err.message });
    return getMockPrice('meesho', Math.floor(Math.random() * 500) + 500);
  }
}

module.exports = { fetchMeeshoProductWithReviews, fetchMeeshoPrice, fetchMeeshoPriceByUrl };
