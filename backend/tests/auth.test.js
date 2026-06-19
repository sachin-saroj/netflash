process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_2026';

// Mock express-rate-limit before importing the app to bypass throttles during normal route unit tests
jest.mock('express-rate-limit', () => {
  return () => (req, res, next) => next();
});

const request = require('supertest');
const app = require('../index');
const mongoose = require('mongoose');
mongoose.connection.readyState = 1;
const User = require('../models/User');
const bcrypt = require('bcryptjs');

jest.mock('../models/User', () => {
  const mockFindOne = jest.fn();
  function MockUser(data) {
    Object.assign(this, data);
    this.id = 'mocked-user-id';
  }
  MockUser.findOne = mockFindOne;
  MockUser.prototype.save = jest.fn().mockResolvedValue(this);
  return MockUser;
});

describe('Auth Routes Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' }); // Missing name and password
      
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Please enter all fields');
    });

    it('should reject passwords shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: '123' });
      
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Password must be at least 6 characters');
    });

    it('should reject registration if email already exists', async () => {
      User.findOne.mockResolvedValue({ id: 'existing-id' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: 'password123' });
      
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('User already exists');
    });

    it('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'New User', email: 'new@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('New User');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });
      
      expect(res.status).toBe(400);
    });

    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const mockSelect = jest.fn().mockResolvedValue({
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword
      });
      User.findOne.mockReturnValue({ select: mockSelect });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should return 400 for incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const mockSelect = jest.fn().mockResolvedValue({
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword
      });
      User.findOne.mockReturnValue({ select: mockSelect });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Invalid credentials');
    });
  });
});
