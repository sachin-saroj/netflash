process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_2026';

// Mock express-rate-limit to prevent throttling during route testing
jest.mock('express-rate-limit', () => {
  return () => (req, res, next) => next();
});

const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Watchlist = require('../models/Watchlist');

// Set connection state to connected (to test normal operation, not DB-less degradation)
mongoose.connection.readyState = 1;

const mockItems = [
  { _id: 'item-1', user: 'user-a', productId: 'p1', platform: 'amazon', title: 'Prod 1', savedPrice: 100, url: 'http://amazon.in/dp/B07WHSY9JQ', deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }) },
  { _id: 'item-2', user: 'user-a', productId: 'p2', platform: 'flipkart', title: 'Prod 2', savedPrice: 200, url: 'http://flipkart.com/p/1', deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }) },
  { _id: 'item-3', user: 'user-b', productId: 'p3', platform: 'meesho', title: 'Prod 3', savedPrice: 300, url: 'http://meesho.com/p/3', deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }) }
];

jest.mock('../models/Watchlist', () => {
  const mockFind = jest.fn();
  const mockFindOne = jest.fn();
  const mockFindById = jest.fn();
  
  function MockWatchlist(data) {
    Object.assign(this, data);
    this._id = `mock-watch-${Date.now()}`;
  }
  MockWatchlist.find = mockFind;
  MockWatchlist.findOne = mockFindOne;
  MockWatchlist.findById = mockFindById;
  MockWatchlist.prototype.save = jest.fn().mockImplementation(function() {
    if (!this.productId || !this.platform || !this.title || this.savedPrice === undefined || !this.url) {
      return Promise.reject(new Error('ValidationError: missing required fields'));
    }
    return Promise.resolve(this);
  });
  MockWatchlist.prototype.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
  return MockWatchlist;
});

describe('Watchlist Route Integration', () => {
  let tokenA;

  beforeAll(() => {
    tokenA = jwt.sign({ user: { id: 'user-a' } }, process.env.JWT_SECRET);
  });


  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/watchlist', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/watchlist');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return only watchlist items of current user', async () => {
      const userAItems = mockItems.filter(item => item.user === 'user-a');
      const mockQuery = {
        sort: jest.fn().mockResolvedValue(userAItems)
      };
      Watchlist.find.mockReturnValue(mockQuery);

      const res = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].productId).toBe('p1');
      expect(Watchlist.find).toHaveBeenCalledWith({ user: 'user-a' });
    });
  });

  describe('POST /api/watchlist', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/watchlist')
        .send({ productId: 'p4', platform: 'amazon', title: 'Prod 4', currentPrice: 400, url: 'http://...' });
      
      expect(res.status).toBe(401);
    });

    it('should save a valid item to watchlist', async () => {
      Watchlist.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          productId: 'p4',
          platform: 'amazon',
          title: 'Prod 4',
          currentPrice: 400,
          url: 'http://amazon.in/dp/B07WHSY9JQ'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.productId).toBe('p4');
    });

    it('should reject save request if item already in watchlist', async () => {
      Watchlist.findOne.mockResolvedValue(mockItems[0]);

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          productId: 'p1',
          platform: 'amazon',
          title: 'Prod 1',
          currentPrice: 100,
          url: 'http://amazon.in/dp/B07WHSY9JQ'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Item already in watchlist');
    });

    it('should trigger server validation error if required fields missing', async () => {
      Watchlist.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          productId: '', // missing
          platform: 'amazon',
          title: 'Prod 4',
          currentPrice: 400,
          url: 'http://...'
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/watchlist/:id', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).delete('/api/watchlist/item-1');
      expect(res.status).toBe(401);
    });

    it('should delete watchlist item owned by user', async () => {
      const itemToDelete = mockItems[0];
      Watchlist.findById.mockResolvedValue(itemToDelete);

      const res = await request(app)
        .delete('/api/watchlist/item-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(itemToDelete.deleteOne).toHaveBeenCalled();
    });

    it('should reject delete request (IDOR) for item owned by another user', async () => {
      const anotherUserItem = mockItems[2]; // Owned by user-b
      Watchlist.findById.mockResolvedValue(anotherUserItem);

      const res = await request(app)
        .delete('/api/watchlist/item-3')
        .set('Authorization', `Bearer ${tokenA}`); // user-a trying to delete user-b's item

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Not authorized');
      expect(anotherUserItem.deleteOne).not.toHaveBeenCalled();
    });

    it('should return 404 error if item not found', async () => {
      Watchlist.findById.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/watchlist/nonexistent')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Item not found');
    });
  });
});
