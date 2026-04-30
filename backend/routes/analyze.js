const express = require('express');
const router = express.Router();
const { extractProductId } = require('../utils/extractProductId');
const { analyzeReviews } = require('../services/gemini');
const { fetchProductWithReviews } = require('../services/amazon');
const { fetchFlipkartProductWithReviews } = require('../services/flipkart');
const { fetchMeeshoProductWithReviews } = require('../services/meesho');
const Cache = require('../models/Cache');
const logger = require('../utils/logger');

/**
 * Fetch product + reviews from the correct platform.
 */
async function fetchFromPlatform(platform, productId, originalUrl) {
  switch (platform) {
    case 'amazon':
      return fetchProductWithReviews(productId, 'amazon');
    case 'flipkart':
      return fetchFlipkartProductWithReviews(productId);
    case 'meesho':
      return fetchMeeshoProductWithReviews(productId, originalUrl);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_URL', message: 'URL is required' }
    });
  }

  let platformData;
  try {
    platformData = extractProductId(url);
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: err.message }
    });
  }

  const cacheKey = `analysis:${platformData.platform}:${platformData.id}`;

  // Check cache first
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const cached = await Cache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } });
      if (cached) {
        logger.info('analyze', 'Returning cached analysis', { key: cacheKey });
        return res.json({ success: true, data: cached.data, cached: true });
      }
    }
  } catch (_) {
    logger.warn('analyze', 'Cache lookup failed, continuing without cache');
  }

  try {
    // Fetch product + reviews from the detected platform
    logger.info('analyze', `Fetching from ${platformData.platform}`, { id: platformData.id });
    const productData = await fetchFromPlatform(platformData.platform, platformData.id, url);

    if (!productData.reviews || productData.reviews.length < 5) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_REVIEWS',
          message: `Only ${productData.reviews?.length || 0} reviews found. Need at least 5 for analysis.`
        }
      });
    }

    // Run AI analysis
    const analysis = await analyzeReviews(productData.reviews);

    // Generate a realistic 30-day mock price history based on current price
    const generatePriceHistory = (basePrice) => {
      if (!basePrice || typeof basePrice !== 'number') return [];
      const history = [];
      let currentSimPrice = basePrice * 1.1; // Start 10% higher 30 days ago
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Random fluctuation between -2% and +2%
        const fluctuation = currentSimPrice * (Math.random() * 0.04 - 0.02);
        currentSimPrice += fluctuation;
        
        // Force the last day to be exactly the current price
        if (i === 0) currentSimPrice = basePrice;
        
        history.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          price: Math.round(currentSimPrice)
        });
      }
      return history;
    };

    const result = {
      product: {
        id: platformData.id,
        platform: platformData.platform,
        title: productData.title,
        image: productData.image,
        rating: productData.rating,
        reviewCount: productData.reviewCount,
        currentPrice: productData.currentPrice,
        priceHistory: generatePriceHistory(productData.currentPrice)
      },
      analysis
    };

    // Cache for 2 hours (only if DB is connected)
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      try {
        await Cache.findOneAndUpdate(
          { key: cacheKey },
          { key: cacheKey, data: result, expiresAt },
          { upsert: true }
        );
      } catch (cacheErr) {
        logger.warn('analyze', 'Failed to save cache, ignoring', { error: cacheErr.message });
      }
    } else {
      logger.warn('analyze', 'Skipping cache save: DB not connected');
    }

    logger.info('analyze', 'Analysis complete', {
      platform: platformData.platform,
      productId: platformData.id,
      trustScore: analysis.trustScore
    });

    return res.json({ success: true, data: result, cached: false });

  } catch (err) {
    logger.error('analyze', 'Analysis failed', { error: err.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: 'Analysis failed. Check API keys and try again.',
        detail: err.message
      }
    });
  }
});

module.exports = router;
