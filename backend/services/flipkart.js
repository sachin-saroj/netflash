const axios = require('axios');
const { cleanReviews } = require('../utils/cleanReviews');
const { getMockProductDetails, getMockPrice } = require('../utils/mockData');
const { scrapeProductDetails } = require('./puppeteerScraper');
const logger = require('../utils/logger');

const RAPIDAPI_KEY = () => process.env.RAPIDAPI_KEY;
const FLIPKART_HOST = 'real-time-flipkart-data2.p.rapidapi.com';

/**
 * Fetch Flipkart product details + reviews by product ID.
 * Falls back to mock data because the API lacks a reviews endpoint.
 */
async function fetchFlipkartProductWithReviews(productId, originalUrl = '') {
  let apiData = null;
  if (RAPIDAPI_KEY()) {
    try {
      logger.info('flipkart', `Fetching Flipkart product: ${productId} via API`);
      const response = await axios.get(`https://${FLIPKART_HOST}/product`, {
        params: { pid: productId },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY(),
          'X-RapidAPI-Host': FLIPKART_HOST
        },
        timeout: 10000
      });

      const p = response.data;
      if (p) {
        const price = parseFloat(String(p.price || p.selling_price || '0').replace(/[₹,\s]/g, ''));
        const mrp = parseFloat(String(p.mrp || p.original_price || '0').replace(/[₹,\s]/g, ''));
        apiData = {
          title: p.title || p.product_name,
          image: p.image || p.product_photo || (p.images && p.images[0]),
          rating: parseFloat(p.rating) || 4.3,
          reviewCount: parseInt(p.review_count) || 120,
          currentPrice: price,
          mrp: mrp || Math.round(price * 1.25),
          url: p.url || p.product_url || `https://www.flipkart.com/product/p/itm?pid=${productId}`
        };
      }
    } catch (err) {
      logger.warn('flipkart', 'Flipkart API details fetch failed, will try scraping', { error: err.message });
    }
  }

  // Attempt local scrape to get reviews and details
  try {
    const scraped = await scrapeProductDetails('flipkart', productId, originalUrl);
    if (apiData) {
      return {
        ...apiData,
        reviews: scraped.reviews || []
      };
    }
    return scraped;
  } catch (scrapeErr) {
    logger.warn('flipkart', 'Local scrape failed, merging with API data or fallback to mock', { error: scrapeErr.message });
    if (apiData) {
      return {
        ...apiData,
        reviews: []
      };
    }
    return getMockProductDetails('flipkart', productId);
  }
}

/**
 * Search Flipkart for a product by title and return price data.
 */
async function fetchFlipkartPrice(productTitle, sourcePrice) {
  if (!RAPIDAPI_KEY()) {
    return getMockPrice('flipkart', sourcePrice, productTitle);
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
    return getMockPrice('flipkart', sourcePrice, productTitle); 
  }
}

module.exports = { fetchFlipkartProductWithReviews, fetchFlipkartPrice };
