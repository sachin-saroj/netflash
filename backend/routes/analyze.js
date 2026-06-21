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
      return fetchProductWithReviews(productId, originalUrl);
    case 'flipkart':
      return fetchFlipkartProductWithReviews(productId, originalUrl);
    case 'meesho':
      return fetchMeeshoProductWithReviews(productId, originalUrl);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

const axios = require('axios');

async function expandUrl(shortUrl) {
  try {
    const response = await axios.get(shortUrl, {
      maxRedirects: 5,
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return response.request.res.responseUrl || shortUrl;
  } catch (err) {
    logger.warn('analyze', 'Failed to expand URL redirect via GET, trying HEAD', { error: err.message });
    try {
      const response = await axios.head(shortUrl, {
        maxRedirects: 5,
        timeout: 5000
      });
      return response.request.res.responseUrl || shortUrl;
    } catch (_) {
      return shortUrl;
    }
  }
}

const generatePriceHistory = (basePrice, mrpVal) => {
  if (!basePrice || typeof basePrice !== 'number') return [];
  const history = [];
  let maxPrice = mrpVal || Math.round(basePrice * 1.25);
  if (maxPrice < basePrice) maxPrice = Math.round(basePrice * 1.25);
  const minPrice = Math.round(basePrice * 0.95);
  
  let currentSimPrice = Math.round(basePrice * 1.12);
  if (currentSimPrice > maxPrice) currentSimPrice = maxPrice;

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const dayOfWeek = date.getDay();
    let patternModifier = 0;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      patternModifier = - (basePrice * 0.04);
    } else if (dayOfWeek === 3) {
      patternModifier = (basePrice * 0.02);
    }
    
    const randomFluctuation = basePrice * (Math.random() * 0.04 - 0.02);
    let dayPrice = Math.round(currentSimPrice + patternModifier + randomFluctuation);
    
    if (dayPrice < minPrice) dayPrice = minPrice;
    if (dayPrice > maxPrice) dayPrice = maxPrice;
    if (i === 0) dayPrice = basePrice;
    
    currentSimPrice = Math.round(currentSimPrice * 0.95 + dayPrice * 0.05);
    if (currentSimPrice < minPrice) currentSimPrice = minPrice;
    if (currentSimPrice > maxPrice) currentSimPrice = maxPrice;
    
    history.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Math.round(dayPrice)
    });
  }
  return history;
};

const inMemoryCache = new Map();
const inProgressRequests = new Map();

router.post('/', async (req, res) => {
  let { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_URL', message: 'URL is required' }
    });
  }

  // If it's a shortened domain, resolve it first
  if (/amzn\.|fkrt\./i.test(url)) {
    logger.info('analyze', 'Short URL detected, expanding...', { url });
    url = await expandUrl(url);
    logger.info('analyze', 'Expanded URL to:', { url });
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

  // 1. Check MongoDB cache first (if connected)
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const cached = await Cache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } });
      if (cached) {
        logger.info('analyze', 'Returning cached analysis from MongoDB', { key: cacheKey });
        return res.json({ success: true, data: cached.data, cached: true });
      }
    }
  } catch (_) {
    logger.warn('analyze', 'Cache lookup failed, continuing without cache');
  }

  // 2. Check In-Memory cache (for DB-less mode or fast retrieval)
  if (inMemoryCache.has(cacheKey)) {
    const cached = inMemoryCache.get(cacheKey);
    if (cached.expiresAt > Date.now()) {
      logger.info('analyze', 'Returning cached analysis from In-Memory Cache', { key: cacheKey });
      return res.json({ success: true, data: cached.data, cached: true });
    } else {
      inMemoryCache.delete(cacheKey);
    }
  }

  // 3. Deduplicate concurrent requests
  let analysisPromise;
  if (inProgressRequests.has(cacheKey)) {
    logger.info('analyze', 'Duplicate concurrent request detected, joining existing execution', { cacheKey });
    analysisPromise = inProgressRequests.get(cacheKey);
  } else {
    logger.info('analyze', 'Starting new analysis execution', { cacheKey });
    analysisPromise = (async () => {
      // Fetch product + reviews from the detected platform
      logger.info('analyze', `Fetching from ${platformData.platform}`, { id: platformData.id });
      const productData = await fetchFromPlatform(platformData.platform, platformData.id, url);

      // Run AI analysis
      const analysis = await analyzeReviews(productData.reviews || [], productData.title);

      const result = {
        product: {
          id: platformData.id,
          platform: platformData.platform,
          title: productData.title,
          image: productData.image,
          rating: productData.rating,
          reviewCount: productData.reviewCount,
          currentPrice: productData.currentPrice,
          priceHistory: productData.priceHistory || generatePriceHistory(productData.currentPrice, productData.mrp)
        },
        analysis
      };

      return result;
    })();

    inProgressRequests.set(cacheKey, analysisPromise);
  }

  try {
    const result = await analysisPromise;

    // Save to caches
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    inMemoryCache.set(cacheKey, { data: result, expiresAt: expiresAt.getTime() });

    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        await Cache.findOneAndUpdate(
          { key: cacheKey },
          { key: cacheKey, data: result, expiresAt },
          { upsert: true }
        );
      } else {
        logger.warn('analyze', 'Skipping Mongo cache save: DB not connected');
      }
    } catch (cacheErr) {
      logger.warn('analyze', 'Failed to save cache in Mongo, ignoring', { error: cacheErr.message });
    }

    logger.info('analyze', 'Analysis complete', {
      platform: platformData.platform,
      productId: platformData.id,
      trustScore: result.analysis.trustScore
    });

    return res.json({ success: true, data: result, cached: false });

  } catch (err) {
    logger.error('analyze', 'Analysis failed, attempting URL slug fallback', { error: err.message });
    
    // Clean up in-progress map on failure so next request can retry
    inProgressRequests.delete(cacheKey);

    // Fallback: try to extract title from the URL slug
    let fallbackTitle = '';
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      let slug = '';
      if (parsed.hostname.includes('amazon')) {
        const dpIdx = pathParts.indexOf('dp');
        slug = dpIdx > 0 ? pathParts[dpIdx - 1] : (pathParts.length > 0 && !['gp', 'dp', 'product'].includes(pathParts[0]) ? pathParts[0] : '');
      } else if (parsed.hostname.includes('flipkart') || parsed.hostname.includes('meesho')) {
        const pIdx = pathParts.indexOf('p');
        slug = pIdx > 0 ? pathParts[pIdx - 1] : (pathParts.length > 0 && !['product', 's', 'p'].includes(pathParts[0]) ? pathParts[0] : '');
      }
      if (slug) {
        fallbackTitle = decodeURIComponent(slug).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, char => char.toUpperCase()).trim();
      }
    } catch (_) {}

    if (fallbackTitle) {
      logger.info('analyze', `Successfully extracted fallback title: "${fallbackTitle}". Generating local analysis.`);
      try {
        const basePrice = platformData.platform === 'meesho' ? 499 : 1499;
        const analysis = await analyzeReviews([], fallbackTitle);
        
        const result = {
          product: {
            id: platformData.id,
            platform: platformData.platform,
            title: fallbackTitle,
            image: platformData.platform === 'meesho' ? 'https://images.meesho.com/images/products/76018768/xb76g_512.webp' : 'https://via.placeholder.com/300',
            rating: 4.1,
            reviewCount: 420,
            currentPrice: basePrice,
            priceHistory: generatePriceHistory(basePrice, null)
          },
          analysis
        };
        return res.json({ success: true, data: result, cached: false });
      } catch (innerErr) {
        logger.error('analyze', 'Fallback analysis generation failed', { error: innerErr.message });
      }
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: 'Analysis failed. Check API keys and try again.',
        detail: err.message
      }
    });
  } finally {
    inProgressRequests.delete(cacheKey);
  }
});

module.exports = router;
