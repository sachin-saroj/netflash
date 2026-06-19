process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_2026';

// Mock express-rate-limit before importing the app to bypass rate limiter during analyze tests
jest.mock('express-rate-limit', () => {
  return () => (req, res, next) => next();
});

const request = require('supertest');
const app = require('../index');
const { fetchProductWithReviews } = require('../services/amazon');
const { analyzeReviews } = require('../services/gemini');

jest.mock('../services/amazon');
jest.mock('../services/gemini');

describe('Analyze Route Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return live analysis on successful API flow', async () => {
    // Mock Amazon service details + reviews
    fetchProductWithReviews.mockResolvedValue({
      title: 'Mock Product Name',
      image: 'http://example.com/image.png',
      rating: 4.5,
      reviewCount: 150,
      currentPrice: 999,
      reviews: [
        { text: 'Great product!', rating: 5 },
        { text: 'Not bad', rating: 4 },
        { text: 'A bit expensive', rating: 3 },
        { text: 'Superb quality', rating: 5 },
        { text: 'Worth buying', rating: 5 }
      ]
    });

    // Mock successful Gemini AI analysis
    analyzeReviews.mockResolvedValue({
      source: 'live',
      demoMode: false,
      trustScore: 8.5,
      reviewsAnalyzed: 5,
      genuinePercent: 90,
      suspiciousPercent: 10,
      incentivizedPercent: 0,
      redFlags: [],
      genuineComplaints: ['None'],
      genuinePositives: ['Great quality'],
      productSummary: {
        overview: 'Good product.',
        buildQuality: 'Excellent',
        valueForMoney: 'Excellent',
        performance: 'Excellent',
        targetAudience: 'Everyone'
      },
      sellerIntel: { riskLevel: 'Safe', redFlags: [] },
      alternatives: [],
      verdict: 'BUY'
    });

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'https://www.amazon.in/dp/B07WHSY9JQ' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product.title).toBe('Mock Product Name');
    expect(res.body.data.analysis.demoMode).toBe(false);
    expect(res.body.data.analysis.source).toBe('live');
  });

  it('should return demo/mock fallback analysis when Gemini fails', async () => {
    // Mock Amazon service details + reviews
    fetchProductWithReviews.mockResolvedValue({
      title: 'ASUS Vivobook Laptop',
      image: 'http://example.com/laptop.png',
      rating: 4.2,
      reviewCount: 45,
      currentPrice: 45000,
      reviews: [
        { text: 'Okay laptop', rating: 4 },
        { text: 'Average battery', rating: 3 },
        { text: 'Nice screen', rating: 4 },
        { text: 'Fast boot', rating: 5 },
        { text: 'Value for money', rating: 5 }
      ]
    });

    // Mock Gemini catch fallback analysis (demoMode: true, dynamic laptop details)
    analyzeReviews.mockResolvedValue({
      source: 'mock',
      demoMode: true,
      trustScore: 7.2,
      reviewsAnalyzed: 5,
      genuinePercent: 78,
      suspiciousPercent: 15,
      incentivizedPercent: 7,
      redFlags: ['Accounts review-burst behavior patterns detected'],
      genuineComplaints: ['Battery life is shorter than advertised'],
      genuinePositives: ['High performance with SSD boot time'],
      productSummary: {
        overview: 'The laptop offers reliable performance for multitasking.',
        buildQuality: 'Average',
        valueForMoney: 'Excellent',
        performance: 'Excellent',
        targetAudience: 'Students'
      },
      sellerIntel: { riskLevel: 'Safe', redFlags: [] },
      alternatives: [],
      verdict: 'BUY'
    });

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'https://www.amazon.in/dp/B07WHSY9JQ' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product.title).toBe('ASUS Vivobook Laptop');
    expect(res.body.data.analysis.demoMode).toBe(true);
    expect(res.body.data.analysis.source).toBe('mock');
  });
});
