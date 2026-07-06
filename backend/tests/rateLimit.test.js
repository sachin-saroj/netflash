process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_2026';

const request = require('supertest');
const app = require('../index');

describe('Authentication Rate Limiting Integration', () => {
  it('should allow up to 5 login requests and then return 429 on the 6th', async () => {
    // Send 5 requests (expecting 400 Bad Request because of missing fields)
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    }

    // 6th request should trigger 429 rate limit
    const resBlocked = await request(app)
      .post('/api/auth/login')
      .send({});
    
    expect(resBlocked.status).toBe(429);
    expect(resBlocked.body.success).toBe(false);
    expect(resBlocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
