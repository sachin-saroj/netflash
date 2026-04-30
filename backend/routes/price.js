const express = require('express');
const router = express.Router();
const { fetchProductDetails } = require('../services/amazon');
const { fetchFlipkartPrice } = require('../services/flipkart');
const { fetchMeeshoPrice } = require('../services/meesho');
const Cache = require('../models/Cache');
const logger = require('../utils/logger');

/**
 * POST /api/price
 * Aggregates prices from Amazon, Flipkart, and Meesho for a given product.
 *
 * Request body: { platformId, productTitle, platform, sourcePrice }
 * - platformId: the original product ID
 * - productTitle: product title for search-based matching on other platforms
 * - platform: the original platform ('amazon', 'flipkart', 'meesho')
 * - sourcePrice: optional — price already known from the analysis step
 */
router.post('/', async (req, res) => {
  const { platformId, productTitle, platform, sourcePrice } = req.body;

  if (!productTitle) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_TITLE', message: 'Product title is required for price comparison.' }
    });
  }

  const cacheKey = `price:${platform}:${platformId || productTitle.slice(0, 40)}`;

  // Check cache (15 min TTL)
  try {
    const cached = await Cache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } });
    if (cached) {
      logger.info('price', 'Returning cached prices', { key: cacheKey });
      return res.json({ success: true, data: cached.data, cached: true });
    }
  } catch (_) {
    logger.warn('price', 'Cache lookup failed, continuing');
  }

  try {
    // Build platform-specific fetch promises
    // For the SOURCE platform, use direct API call with product ID
    // For OTHER platforms, use search by product title

    const amazonPromise = platform === 'amazon'
      ? fetchAmazonPriceById(platformId)
      : fetchAmazonPriceBySearch(productTitle);

    const flipkartPromise = platform === 'flipkart'
      ? fetchFlipkartPriceById(platformId, sourcePrice)
      : fetchFlipkartPrice(productTitle);

    const meeshoPromise = platform === 'meesho'
      ? fetchMeeshoPriceById(platformId, sourcePrice)
      : fetchMeeshoPrice(productTitle);

    const [amazonPrice, flipkartPrice, meeshoPrice] = await Promise.allSettled([
      amazonPromise,
      flipkartPromise,
      meeshoPromise
    ]);

    const prices = [];

    // Amazon
    if (amazonPrice.status === 'fulfilled' && amazonPrice.value) {
      prices.push(amazonPrice.value);
    } else {
      prices.push({ platform: 'amazon', price: null, available: false });
    }

    // Flipkart
    if (flipkartPrice.status === 'fulfilled' && flipkartPrice.value) {
      prices.push(flipkartPrice.value);
    } else {
      prices.push({ platform: 'flipkart', price: null, available: false });
    }

    // Meesho
    if (meeshoPrice.status === 'fulfilled' && meeshoPrice.value) {
      prices.push(meeshoPrice.value);
    } else {
      prices.push({ platform: 'meesho', price: null, available: false });
    }

    // Find cheapest
    const availablePrices = prices.filter(p => p.available && p.price > 0);
    let cheapestPlatform = null;
    let savings = 0;

    if (availablePrices.length >= 2) {
      availablePrices.sort((a, b) => a.price - b.price);
      cheapestPlatform = availablePrices[0].platform;
      savings = availablePrices[availablePrices.length - 1].price - availablePrices[0].price;
    } else if (availablePrices.length === 1) {
      cheapestPlatform = availablePrices[0].platform;
    }

    prices.forEach(p => {
      p.isCheapest = p.platform === cheapestPlatform;
    });

    const result = {
      prices,
      cheapestPlatform,
      savings: Math.round(savings),
      checkedAt: new Date().toISOString()
    };

    // Cache for 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await Cache.findOneAndUpdate(
      { key: cacheKey },
      { key: cacheKey, data: result, expiresAt },
      { upsert: true }
    ).catch(() => {});

    logger.info('price', 'Price comparison complete', {
      found: availablePrices.length,
      cheapest: cheapestPlatform,
      savings
    });

    return res.json({ success: true, data: result, cached: false });

  } catch (err) {
    logger.error('price', 'Price comparison failed', { error: err.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'PRICE_FETCH_FAILED',
        message: 'Could not fetch prices. Please try again.',
        detail: err.message
      }
    });
  }
});

// ── Platform-specific price fetchers ──

const { getMockPrice } = require('../utils/mockData');

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
    logger.warn('price', 'Amazon price fetch failed, using mock data', { error: err.message });
    return getMockPrice('amazon', 800);
  }
}

async function fetchAmazonPriceBySearch(productTitle) {
  // Amazon doesn't have a search API in our stack — return mock data
  logger.info('price', 'Amazon search-by-title not available, returning mock price');
  return getMockPrice('amazon', Math.floor(Math.random() * 500) + 500);
}

async function fetchFlipkartPriceById(productId, knownPrice) {
  // If we already have the price from analysis, use it
  if (knownPrice && knownPrice > 0) {
    return {
      platform: 'flipkart',
      price: knownPrice,
      title: '',
      url: null,
      available: true
    };
  }
  // Otherwise fetch fresh
  try {
    const axios = require('axios');
    const response = await axios.get('https://real-time-flipkart-data2.p.rapidapi.com/product', {
      params: { pid: productId },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'real-time-flipkart-data2.p.rapidapi.com'
      },
      timeout: 10000
    });
    const p = response.data;
    const price = parseFloat(String(p?.price || p?.selling_price || '0').replace(/[₹,\s]/g, ''));
    if (price <= 0) throw new Error('Invalid price');
    return { platform: 'flipkart', price, available: true };
  } catch (err) {
    logger.warn('price', 'Flipkart direct price fetch failed, using mock data', { error: err.message });
    return getMockPrice('flipkart', Math.floor(Math.random() * 500) + 500);
  }
}

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
  try {
    const axios = require('axios');
    const productUrl = `https://www.meesho.com/product/${productId}`;
    const response = await axios.post(
      'https://meesho-price-history-tracker4.p.rapidapi.com/meesho.php',
      `url=${encodeURIComponent(productUrl)}`,
      {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'meesho-price-history-tracker4.p.rapidapi.com'
      },
      timeout: 10000
    });
    
    const data = response.data;
    let price = 0;
    if (Array.isArray(data) && data.length > 0) {
      price = data[0].averageprice || data[0].lowestprice || 0;
    } else {
      price = parseFloat(String(data?.price || data?.current_price || '0').replace(/[₹,\s]/g, ''));
    }
    
    if (price <= 0) throw new Error('Invalid price');
    
    return { platform: 'meesho', price, available: true };
  } catch (err) {
    logger.warn('price', 'Meesho direct price fetch failed, using mock data', { error: err.message });
    return getMockPrice('meesho', Math.floor(Math.random() * 500) + 500);
  }
}

module.exports = router;
