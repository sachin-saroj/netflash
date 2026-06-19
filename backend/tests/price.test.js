process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_2026';

// Mock express-rate-limit to prevent throttling during route testing
jest.mock('express-rate-limit', () => {
  return () => (req, res, next) => next();
});

const request = require('supertest');
const app = require('../index');
const Cache = require('../models/Cache');

// Mock service layers to prevent actual HTTP scraper connections
const amazonService = require('../services/amazon');
const flipkartService = require('../services/flipkart');
const meeshoService = require('../services/meesho');

jest.mock('../services/amazon', () => ({
  fetchAmazonPriceById: jest.fn(),
  fetchAmazonPriceBySearch: jest.fn()
}));

jest.mock('../services/flipkart', () => ({
  fetchFlipkartPriceById: jest.fn(),
  fetchFlipkartPrice: jest.fn()
}));

jest.mock('../services/meesho', () => ({
  fetchMeeshoPriceById: jest.fn(),
  fetchMeeshoPrice: jest.fn()
}));

jest.mock('../models/Cache', () => {
  return {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn().mockResolvedValue(true)
  };
});

describe('Price Route Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/price', () => {
    it('should reject requests missing product title', async () => {
      const res = await request(app)
        .post('/api/price')
        .send({ platformId: 'B07WHSY9JQ', platform: 'amazon' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_TITLE');
    });

    it('should return cached prices on cache hit', async () => {
      const cachedData = {
        prices: [
          { platform: 'amazon', price: 999, available: true, isCheapest: true },
          { platform: 'flipkart', price: 1099, available: true },
          { platform: 'meesho', price: null, available: false }
        ],
        cheapestPlatform: 'amazon',
        savings: 100,
        checkedAt: new Date().toISOString()
      };

      Cache.findOne.mockResolvedValue({ data: cachedData });

      const res = await request(app)
        .post('/api/price')
        .send({
          platformId: 'B07WHSY9JQ',
          productTitle: 'boAt Rockerz 450',
          platform: 'amazon',
          sourcePrice: 999
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cached).toBe(true);
      expect(res.body.data.cheapestPlatform).toBe('amazon');
      expect(amazonService.fetchAmazonPriceById).not.toHaveBeenCalled();
    });

    it('should query services on cache miss and correctly determine cheapest price', async () => {
      Cache.findOne.mockResolvedValue(null);

      // Setup mock resolutions for Amazon, Flipkart, Meesho
      amazonService.fetchAmazonPriceById.mockResolvedValue({ platform: 'amazon', price: 1200, available: true });
      flipkartService.fetchFlipkartPrice.mockResolvedValue({ platform: 'flipkart', price: 1000, available: true });
      meeshoService.fetchMeeshoPrice.mockResolvedValue({ platform: 'meesho', price: 1100, available: true });

      const res = await request(app)
        .post('/api/price')
        .send({
          platformId: 'B07WHSY9JQ',
          productTitle: 'boAt Rockerz 450',
          platform: 'amazon',
          sourcePrice: 1200
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cached).toBe(false);
      expect(res.body.data.cheapestPlatform).toBe('flipkart');
      expect(res.body.data.savings).toBe(200); // 1200 - 1000 = 200
      
      const flipkartResult = res.body.data.prices.find(p => p.platform === 'flipkart');
      expect(flipkartResult.isCheapest).toBe(true);
      expect(Cache.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should handle service rejections gracefully using Promise.allSettled', async () => {
      Cache.findOne.mockResolvedValue(null);

      // Amazon succeeds, Flipkart throws error, Meesho succeeds
      amazonService.fetchAmazonPriceById.mockResolvedValue({ platform: 'amazon', price: 1200, available: true });
      flipkartService.fetchFlipkartPrice.mockRejectedValue(new Error('Scraper failure'));
      meeshoService.fetchMeeshoPrice.mockResolvedValue({ platform: 'meesho', price: 1100, available: true });

      const res = await request(app)
        .post('/api/price')
        .send({
          platformId: 'B07WHSY9JQ',
          productTitle: 'boAt Rockerz 450',
          platform: 'amazon',
          sourcePrice: 1200
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Flipkart is listed as not available instead of crashing
      const flipkartResult = res.body.data.prices.find(p => p.platform === 'flipkart');
      expect(flipkartResult.available).toBe(false);
      
      // Cheapest is calculated from available ones: Meesho (1100) vs Amazon (1200)
      expect(res.body.data.cheapestPlatform).toBe('meesho');
      expect(res.body.data.savings).toBe(100); // 1200 - 1100 = 100
    });

    it('should handle no available prices correctly', async () => {
      Cache.findOne.mockResolvedValue(null);

      amazonService.fetchAmazonPriceById.mockResolvedValue({ platform: 'amazon', price: null, available: false });
      flipkartService.fetchFlipkartPrice.mockResolvedValue({ platform: 'flipkart', price: null, available: false });
      meeshoService.fetchMeeshoPrice.mockResolvedValue({ platform: 'meesho', price: null, available: false });

      const res = await request(app)
        .post('/api/price')
        .send({
          platformId: 'B07WHSY9JQ',
          productTitle: 'boAt Rockerz 450',
          platform: 'amazon'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.cheapestPlatform).toBeNull();
      expect(res.body.data.savings).toBe(0);
    });
  });
});
