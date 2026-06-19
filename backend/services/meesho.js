const { cleanReviews } = require('../utils/cleanReviews');
const { getMockProductDetails, getMockPrice } = require('../utils/mockData');
const { createRapidApiClient, requestWithRetry } = require('./clients/rapidApi');
const logger = require('../utils/logger');

const MEESHO_HOST = 'meesho-price-history-tracker4.p.rapidapi.com';
const meeshoClient = createRapidApiClient(MEESHO_HOST);

/**
 * Fetch Meesho product details + reviews by product ID.
 * Meesho RapidAPI lacks reviews, so this returns mock data directly.
 */
async function fetchMeeshoProductWithReviews(productId, originalUrl) {
  logger.info('meesho', 'Serving mock Meesho data (API lacks reviews/details endpoint)', {
    productId,
    source: 'mock'
  });
  return getMockProductDetails('meesho', productId);
}

/**
 * Fetch Meesho price for a product by title (used in cross-platform price comparison).
 * Meesho's RapidAPI does not support search-by-title, so this always returns mock data.
 */
async function fetchMeeshoPrice(productTitle, knownPrice) {
  logger.info('meesho', 'Serving mock Meesho price (no search-by-title API available)', {
    source: 'mock'
  });
  if (knownPrice) {
    return getMockPrice('meesho', knownPrice, productTitle);
  }
  return getMockPrice('meesho', Math.floor(Math.random() * 500) + 500, productTitle);
}

/**
 * Fetch Meesho price by URL.
 */
async function fetchMeeshoPriceByUrl(productUrl) {
  if (!process.env.RAPIDAPI_KEY) {
    logger.info('meesho', 'Serving mock Meesho price (RAPIDAPI_KEY not set)', { source: 'mock' });
    return getMockPrice('meesho', 800, productUrl);
  }

  try {
    const response = await requestWithRetry(meeshoClient, {
      method: 'POST',
      url: '/meesho.php',
      data: `url=${encodeURIComponent(productUrl)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;
    let price = 0;
    if (Array.isArray(data) && data.length > 0) {
      price = data[0].averageprice || data[0].lowestprice || 0;
    } else {
      price = parseFloat(String(data?.price || data?.current_price || '0').replace(/[₹,\s]/g, ''));
    }

    if (price <= 0) throw new Error('Invalid price from Meesho API');

    logger.info('meesho', 'Returning live Meesho price', { price, source: 'live' });

    return {
      platform: 'meesho',
      price,
      title: 'Meesho Product',
      url: productUrl,
      available: price > 0
    };
  } catch (err) {
    logger.warn('meesho', 'Meesho price by URL failed, serving mock data', {
      error: err.message,
      source: 'mock'
    });
    return getMockPrice('meesho', Math.floor(Math.random() * 500) + 500, productUrl);
  }
}

/**
 * Fetch Meesho price directly by product ID.
 */
async function fetchMeeshoPriceById(productId, knownPrice) {
  if (knownPrice && knownPrice > 0) {
    return {
      platform: 'meesho',
      price: knownPrice,
      title: '',
      url: null,
      available: true
    };
  }

  const productUrl = `https://www.meesho.com/product/${productId}`;
  try {
    const result = await fetchMeeshoPriceByUrl(productUrl);
    return {
      platform: 'meesho',
      price: result.price,
      title: result.title,
      url: result.url,
      available: result.available
    };
  } catch (err) {
    logger.warn('meesho', 'Meesho direct price fetch failed, using mock data', { error: err.message });
    return getMockPrice('meesho', Math.floor(Math.random() * 500) + 500, productId);
  }
}

module.exports = {
  fetchMeeshoProductWithReviews,
  fetchMeeshoPrice,
  fetchMeeshoPriceByUrl,
  fetchMeeshoPriceById
};
