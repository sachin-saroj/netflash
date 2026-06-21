const axios = require('axios');
const { cleanReviews } = require('../utils/cleanReviews');
const { getMockProductDetails, getMockPrice } = require('../utils/mockData');
const { scrapeProductDetails } = require('./puppeteerScraper');
const logger = require('../utils/logger');

const RAPIDAPI_KEY = () => process.env.RAPIDAPI_KEY;
const MEESHO_HOST = 'meesho-price-history-tracker4.p.rapidapi.com';

/**
 * Fetch Meesho product details + reviews by product ID.
 * This API uses POST with product URL (not GET with ID).
 * Falls back to mock data because the API only provides price history, not reviews.
 */
async function fetchMeeshoProductWithReviews(productId, originalUrl) {
  const productUrl = originalUrl && originalUrl.includes('meesho.com')
    ? originalUrl
    : `https://www.meesho.com/p/${productId}`;

  logger.info('meesho', `Fetching Meesho product: ${productId}`);

  let apiPrice = 0;
  let priceHistory = null;

  if (RAPIDAPI_KEY()) {
    try {
      logger.info('meesho', `Fetching Meesho price and history via API for URL: ${productUrl}`);
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
      if (Array.isArray(data) && data.length > 0) {
        const apiItem = data[0];
        apiPrice = apiItem.lowestprice || apiItem.averageprice || 0;
        if (apiItem.pricedata && apiItem.pricedata.length > 0) {
          priceHistory = apiItem.pricedata.map(pt => {
            const dt = new Date(pt.datec);
            return {
              date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              price: Math.round(pt.currentprice),
              timestamp: dt.getTime()
            };
          })
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(({ date, price }) => ({ date, price }));
        }
      } else if (data) {
        apiPrice = parseFloat(String(data.price || data.current_price || '0').replace(/[₹,\s]/g, ''));
      }
    } catch (err) {
      logger.warn('meesho', 'Meesho API details fetch failed, continuing to scrape', { error: err.message });
    }
  }

  // Fallback to local Puppeteer scrape to get real reviews and details
  try {
    const scraped = await scrapeProductDetails('meesho', productId, productUrl);
    if (apiPrice > 0) {
      scraped.currentPrice = apiPrice;
    }
    if (priceHistory) {
      scraped.priceHistory = priceHistory;
    }
    return scraped;
  } catch (scrapeErr) {
    logger.warn('meesho', 'Meesho scrape failed, using static mock details as last resort', { error: scrapeErr.message });
    const mock = getMockProductDetails('meesho', productId);
    if (apiPrice > 0) {
      mock.currentPrice = apiPrice;
    }
    if (priceHistory) {
      mock.priceHistory = priceHistory;
    }
    return mock;
  }
}

async function fetchMeeshoPrice(productTitle, sourcePrice) {
  return getMockPrice('meesho', sourcePrice, productTitle);
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
