const express = require('express');
const router = express.Router();
const { fetchAmazonPriceById, fetchAmazonPriceBySearch } = require('../services/amazon');
const { fetchFlipkartPriceById, fetchFlipkartPrice } = require('../services/flipkart');
const { fetchMeeshoPriceById, fetchMeeshoPrice } = require('../services/meesho');
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
    // Build platform-specific fetch promises using service layer methods.
    // Route layer remains clean and is not aware of Axios configuration, headers, or external URLs.
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

module.exports = router;
