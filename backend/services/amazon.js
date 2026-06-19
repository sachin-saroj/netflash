const { cleanReviews } = require('../utils/cleanReviews');
const { getMockProductDetails, getMockPrice } = require('../utils/mockData');
const { createRapidApiClient, requestWithRetry } = require('./clients/rapidApi');
const logger = require('../utils/logger');

const RAPIDAPI_HOST = 'real-time-amazon-data-mega.p.rapidapi.com';
const amazonClient = createRapidApiClient(RAPIDAPI_HOST);

/** Simple delay helper */
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Fetch product details from Amazon via RapidAPI
 */
async function fetchProductDetails(asin) {
  try {
    const response = await requestWithRetry(amazonClient, {
      method: 'GET',
      url: '/product-details',
      params: {
        asin,
        country: 'IN'
      }
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
  const allReviews = [];

  for (let page = 1; page <= pages; page++) {
    try {
      // Add slight delay between pages to avoid rate limiting
      if (page > 1) await delay(1000);

      const response = await requestWithRetry(amazonClient, {
        method: 'GET',
        url: '/product-reviews',
        params: {
          asin,
          country: 'IN',
          page: page.toString(),
          sort_by: 'TOP_REVIEWS'
        },
        timeout: 15000 // Custom longer timeout for review extraction
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
async function fetchProductWithReviews(productId) {
  try {
    // Fetch product details first, then reviews with slight stagger
    const productDetails = await fetchProductDetails(productId);
    await delay(500);
    const reviews = await fetchReviews(productId);

    return {
      ...productDetails,
      reviews
    };
  } catch (err) {
    if (err.message === 'MOCK_FALLBACK') {
      logger.info('amazon', 'Using mock data for Amazon product due to API failure or limitation');
      return getMockProductDetails('amazon', productId);
    }
    throw err;
  }
}

/**
 * Fetch Amazon price by ASIN (used in cross-platform price comparison)
 */
async function fetchAmazonPriceById(asin) {
  try {
    const product = await fetchProductDetails(asin);
    return {
      platform: 'amazon',
      price: product.currentPrice || null,
      title: product.title,
      url: product.url,
      available: product.currentPrice > 0
    };
  } catch (err) {
    logger.warn('amazon', 'Amazon price fetch failed, using mock data', { error: err.message });
    return getMockPrice('amazon', 800, asin);
  }
}

/**
 * Search Amazon for a product by title (unsupported in our RapidAPI tier, returns honest status)
 */
async function fetchAmazonPriceBySearch(productTitle) {
  logger.info('amazon', 'Amazon search-by-title not supported — skipping', {
    reason: 'No Amazon search API available in current stack',
    source: 'unsupported'
  });
  return {
    platform: 'amazon',
    price: null,
    available: false
  };
}

module.exports = {
  fetchProductDetails,
  fetchReviews,
  fetchProductWithReviews,
  fetchAmazonPriceById,
  fetchAmazonPriceBySearch
};
