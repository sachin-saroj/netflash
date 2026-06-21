const axios = require('axios');
const { cleanReviews } = require('../utils/cleanReviews');
const { getMockProductDetails } = require('../utils/mockData');
const { scrapeProductDetails } = require('./puppeteerScraper');
const logger = require('../utils/logger');

const RAPIDAPI_HOST = 'real-time-amazon-data-mega.p.rapidapi.com';

/** Simple delay helper */
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Make a request with retry for 429 rate-limit errors
 */
async function requestWithRetry(config, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios(config);
    } catch (err) {
      const status = err.response?.status;
      if ((status === 429 || status === 500) && attempt < retries) {
        const waitMs = (attempt + 1) * 2000; // 2s, 4s
        logger.warn('amazon', `Rate limited (${status}), retrying in ${waitMs}ms...`);
        await delay(waitMs);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Fetch product details from Amazon via RapidAPI
 */
async function fetchProductDetails(asin) {
  if (!process.env.RAPIDAPI_KEY) {
    logger.warn('amazon', 'RAPIDAPI_KEY not set, bypassing API and using mock details');
    throw new Error('MOCK_FALLBACK');
  }
  try {
    const response = await requestWithRetry({
      method: 'GET',
      url: `https://${RAPIDAPI_HOST}/product-details`,
      params: {
        asin,
        country: 'IN'
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      timeout: 10000
    });

    const product = response.data?.data;
    // Free API returns {} for IN country code
    if (!product || Object.keys(product).length === 0) {
      throw new Error('Empty product data returned (likely region limitation)');
    }

    return {
      title: product.product_title || 'Unknown Product',
      image: product.product_photo || product.product_photos?.[0] || null,
      rating: parseFloat(product.product_star_rating) || 0,
      reviewCount: parseInt(product.product_num_ratings) || 0,
      currentPrice: parseFloat((product.product_price || '0').replace(/[₹,]/g, '')) || 0,
      url: product.product_url || null
    };
  } catch (err) {
    logger.warn('amazon', 'Failed to fetch product details, falling back to mock data', { asin, error: err.message });
    throw new Error(`MOCK_FALLBACK`);
  }
}

/**
 * Fetch product reviews from Amazon via RapidAPI
 */
async function fetchReviews(asin, pages = 3) {
  if (!process.env.RAPIDAPI_KEY) {
    logger.warn('amazon', 'RAPIDAPI_KEY not set, bypassing API and using mock reviews');
    throw new Error('MOCK_FALLBACK');
  }
  const allReviews = [];

  for (let page = 1; page <= pages; page++) {
    try {
      // Add slight delay between pages to avoid rate limiting
      if (page > 1) await delay(1000);

      const response = await requestWithRetry({
        method: 'GET',
        url: `https://${RAPIDAPI_HOST}/product-reviews`,
        params: {
          asin,
          country: 'IN',
          page: page.toString(),
          sort_by: 'TOP_REVIEWS'
        },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST
        },
        timeout: 15000
      });

      const reviews = response.data?.data?.reviews;
      if (!reviews || reviews.length === 0) break;

      const cleaned = reviews.map(r => ({
        text: r.review_comment || r.review_title || '',
        rating: parseFloat(r.review_star_rating) || 0,
        verifiedPurchase: r.is_verified_purchase || false,
        reviewerTotalReviews: 'unknown',
        date: r.review_date || null
      }));

      allReviews.push(...cleaned);
      logger.debug('amazon', `Fetched page ${page} reviews`, { count: cleaned.length });
    } catch (err) {
      logger.warn('amazon', `Failed to fetch reviews page ${page}`, { error: err.message });
      // If we fail on page 1, trigger fallback if we have no reviews at all
      if (page === 1) throw new Error('MOCK_FALLBACK');
      break;
    }
  }

  return cleanReviews(allReviews, 'amazon');
}

/**
 * Fetch product details + reviews in one call
 */
async function fetchProductWithReviews(productId, originalUrl = '') {
  let apiSucceeded = false;
  if (process.env.RAPIDAPI_KEY) {
    try {
      logger.info('amazon', `Attempting API details fetch for: ${productId}`);
      const productDetails = await fetchProductDetails(productId);
      await delay(500);
      const reviews = await fetchReviews(productId).catch(() => []);
      apiSucceeded = true;
      return {
        ...productDetails,
        reviews
      };
    } catch (err) {
      logger.warn('amazon', 'Amazon API fetch failed, trying local scrape', { error: err.message });
    }
  }

  // Fallback to local Puppeteer scrape
  try {
    const realData = await scrapeProductDetails('amazon', productId, originalUrl);
    return realData;
  } catch (scrapeErr) {
    logger.warn('amazon', 'Local scrape failed, using static mock details fallback as last resort', { error: scrapeErr.message });
    return getMockProductDetails('amazon', productId);
  }
}

module.exports = { fetchProductDetails, fetchReviews, fetchProductWithReviews };
