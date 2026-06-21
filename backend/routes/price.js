const express = require('express');
const router = express.Router();
const axios = require('axios');
const { fetchProductDetails } = require('../services/amazon');
const { scrapeSearchPrice } = require('../services/puppeteerScraper');
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
const inMemoryPrices = new Map();
const inProgressPrices = new Map();

router.post('/', async (req, res) => {
  const { platformId, productTitle, platform, sourcePrice } = req.body;

  if (!productTitle) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_TITLE', message: 'Product title is required for price comparison.' }
    });
  }

  const cacheKey = `price:${platform}:${platformId || productTitle.slice(0, 40)}`;

  // 1. Check MongoDB Cache (15 min TTL)
  try {
    const cached = await Cache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } });
    if (cached) {
      logger.info('price', 'Returning cached prices from MongoDB', { key: cacheKey });
      return res.json({ success: true, data: cached.data, cached: true });
    }
  } catch (_) {
    logger.warn('price', 'Cache lookup failed, continuing');
  }

  // 2. Check In-Memory Cache (15 min TTL)
  if (inMemoryPrices.has(cacheKey)) {
    const cached = inMemoryPrices.get(cacheKey);
    if (cached.expiresAt > Date.now()) {
      logger.info('price', 'Returning cached prices from In-Memory Cache', { key: cacheKey });
      return res.json({ success: true, data: cached.data, cached: true });
    } else {
      inMemoryPrices.delete(cacheKey);
    }
  }

  // 3. Deduplicate concurrent requests
  let pricePromise;
  if (inProgressPrices.has(cacheKey)) {
    logger.info('price', 'Duplicate price comparison request detected, joining existing execution', { cacheKey });
    pricePromise = inProgressPrices.get(cacheKey);
  } else {
    logger.info('price', 'Starting new price comparison execution', { cacheKey });
    pricePromise = (async () => {
      const amazonPromise = platform === 'amazon'
        ? fetchAmazonPriceById(platformId, sourcePrice, productTitle)
        : fetchAmazonPriceBySearch(productTitle, sourcePrice);

      const flipkartPromise = platform === 'flipkart'
        ? fetchFlipkartPriceById(platformId, sourcePrice, productTitle)
        : fetchFlipkartPrice(productTitle, sourcePrice);

      const meeshoPromise = platform === 'meesho'
        ? fetchMeeshoPriceById(platformId, sourcePrice, productTitle)
        : fetchMeeshoPrice(productTitle, sourcePrice);

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

      return result;
    })();

    inProgressPrices.set(cacheKey, pricePromise);
  }

  try {
    const result = await pricePromise;

    // Cache the result in memory & Mongo
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    inMemoryPrices.set(cacheKey, { data: result, expiresAt: expiresAt.getTime() });

    await Cache.findOneAndUpdate(
      { key: cacheKey },
      { key: cacheKey, data: result, expiresAt },
      { upsert: true }
    ).catch(() => {});

    logger.info('price', 'Price comparison complete', {
      found: result.prices.filter(p => p.available).length,
      cheapest: result.cheapestPlatform,
      savings: result.savings
    });

    return res.json({ success: true, data: result, cached: false });

  } catch (err) {
    logger.error('price', 'Price comparison failed', { error: err.message });
    inProgressPrices.delete(cacheKey);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PRICE_FETCH_FAILED',
        message: 'Could not fetch prices. Please try again.',
        detail: err.message
      }
    });
  } finally {
    inProgressPrices.delete(cacheKey);
  }
});

// ── Platform-specific price fetchers ──

async function fetchAmazonPriceById(asin, knownPrice, productTitle = '') {
  if (process.env.RAPIDAPI_KEY) {
    try {
      const product = await fetchProductDetails(asin);
      if (product && product.currentPrice > 0) {
        return {
          platform: 'amazon',
          price: product.currentPrice,
          title: product.title,
          url: product.url,
          available: true
        };
      }
    } catch (err) {
      logger.warn('price', 'Amazon direct price fetch failed, falling back to search scrape', { error: err.message });
    }
  }

  // Fallback to real search scrape
  const query = productTitle || asin;
  if (query) {
    const scraped = await scrapeSearchPrice('amazon', query);
    if (scraped) return scraped;
  }

  // If known price is passed and scraping failed, use it as a last-resort recovery
  if (knownPrice > 0) {
    return {
      platform: 'amazon',
      price: knownPrice,
      title: productTitle || 'Amazon Product',
      url: `https://www.amazon.in/s?k=${encodeURIComponent(productTitle || asin)}`,
      available: true
    };
  }

  return { platform: 'amazon', price: null, available: false };
}

async function fetchAmazonPriceBySearch(productTitle, sourcePrice) {
  if (process.env.RAPIDAPI_KEY) {
    try {
      logger.info('price', `Searching Amazon API for: "${productTitle}"`);
      const cleanQuery = productTitle
        .replace(/\(.*?\)/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const response = await axios.get('https://real-time-amazon-data-mega.p.rapidapi.com/search', {
        params: { query: cleanQuery, country: 'IN' },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'real-time-amazon-data-mega.p.rapidapi.com'
        },
        timeout: 10000
      });

      const products = response.data?.data?.products || [];
      if (products.length > 0) {
        const p = products[0];
        const price = parseFloat((p.product_price || '0').replace(/[₹,]/g, '')) || 0;
        if (price > 0) {
          return {
            platform: 'amazon',
            price,
            title: p.product_title || productTitle,
            url: p.product_url || `https://www.amazon.in/dp/${p.asin}`,
            available: true
          };
        }
      }
    } catch (err) {
      logger.warn('price', 'Amazon API search failed, falling back to Puppeteer search scrape', { error: err.message });
    }
  }

  // Fallback to local scrape
  const scraped = await scrapeSearchPrice('amazon', productTitle);
  if (scraped) return scraped;

  if (sourcePrice > 0) {
    return {
      platform: 'amazon',
      price: sourcePrice,
      title: productTitle,
      url: `https://www.amazon.in/s?k=${encodeURIComponent(productTitle)}`,
      available: true
    };
  }

  return { platform: 'amazon', price: null, available: false };
}

async function fetchFlipkartPriceById(productId, knownPrice, productTitle = '') {
  if (knownPrice && knownPrice > 0) {
    return {
      platform: 'flipkart',
      price: knownPrice,
      title: productTitle,
      url: `https://www.flipkart.com/product/p/itm?pid=${productId}`,
      available: true
    };
  }

  if (process.env.RAPIDAPI_KEY) {
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
      if (price > 0) {
        return {
          platform: 'flipkart',
          price,
          available: true,
          title: p?.title || productTitle,
          url: `https://www.flipkart.com/product/p/itm?pid=${productId}`
        };
      }
    } catch (err) {
      logger.warn('price', 'Flipkart direct price fetch failed, falling back to search scrape', { error: err.message });
    }
  }

  // Fallback to search scrape
  const query = productTitle || productId;
  if (query) {
    const scraped = await scrapeSearchPrice('flipkart', query);
    if (scraped) return scraped;
  }

  return { platform: 'flipkart', price: null, available: false };
}

async function fetchFlipkartPrice(productTitle, sourcePrice) {
  const scraped = await scrapeSearchPrice('flipkart', productTitle);
  if (scraped) return scraped;

  if (sourcePrice > 0) {
    return {
      platform: 'flipkart',
      price: sourcePrice,
      title: productTitle,
      url: `https://www.flipkart.com/search?q=${encodeURIComponent(productTitle)}`,
      available: true
    };
  }

  return { platform: 'flipkart', price: null, available: false };
}

async function fetchMeeshoPriceById(productId, knownPrice, productTitle = '') {
  if (knownPrice && knownPrice > 0) {
    return {
      platform: 'meesho',
      price: knownPrice,
      title: productTitle,
      url: `https://www.meesho.com/p/${productId}`,
      available: true
    };
  }

  if (process.env.RAPIDAPI_KEY) {
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
        }
      );
      
      const data = response.data;
      let price = 0;
      if (Array.isArray(data) && data.length > 0) {
        price = data[0].averageprice || data[0].lowestprice || 0;
      } else {
        price = parseFloat(String(data?.price || data?.current_price || '0').replace(/[₹,\s]/g, ''));
      }
      
      if (price > 0) {
        return {
          platform: 'meesho',
          price,
          available: true,
          title: productTitle || 'Meesho Product',
          url: productUrl
        };
      }
    } catch (err) {
      logger.warn('price', 'Meesho direct price fetch failed, falling back to search scrape', { error: err.message });
    }
  }

  // Fallback to search scrape
  const query = productTitle || productId;
  if (query) {
    const scraped = await scrapeSearchPrice('meesho', query);
    if (scraped) return scraped;
  }

  return { platform: 'meesho', price: null, available: false };
}

async function fetchMeeshoPrice(productTitle, sourcePrice) {
  const scraped = await scrapeSearchPrice('meesho', productTitle);
  if (scraped) return scraped;

  if (sourcePrice > 0) {
    return {
      platform: 'meesho',
      price: sourcePrice,
      title: productTitle,
      url: `https://www.meesho.com/search?q=${encodeURIComponent(productTitle)}`,
      available: true
    };
  }

  return { platform: 'meesho', price: null, available: false };
}

module.exports = router;

