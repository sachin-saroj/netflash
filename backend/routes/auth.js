const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { loginRateLimit, registerRateLimit } = require('../middleware/authRateLimit');

// F-07 FIX: Removed hardcoded JWT secret fallback ('netflash_super_secret_key_2026').
// JWT_SECRET is now validated at startup in middleware/auth.js (fail-fast).
// This file reads from the same env var — single source of truth, no fallback.
const JWT_SECRET = process.env.JWT_SECRET;

// @route   POST /api/auth/register
router.post('/register', registerRateLimit, async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: { message: 'Please enter all fields' } });
    }

    // F-12: Password length check (must be at least 6 characters)
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: { message: 'Password must be at least 6 characters long' } });
    }

    // F-01/F-12 grace degradation: Fallback to in-memory store if MongoDB is down
    if (mongoose.connection.readyState !== 1) {
      if (!global.mockUsers) global.mockUsers = [];
      let user = global.mockUsers.find(u => u.email === email);
      if (user) {
        return res.status(400).json({ success: false, error: { message: 'User already exists' } });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = { id: `mock-${Date.now()}`, name, email, password: hashedPassword };
      global.mockUsers.push(user);
      
      const payload = { user: { id: user.id } };
      jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
        if (err) throw err;
        res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
      });
      return;
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, error: { message: 'User already exists' } });
    }

    user = new User({ name, email, password });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user. Mongoose validation will run for email field format.
    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    });
  } catch (err) {
    // F-12: Handle Mongoose validation errors (such as email format failure) and return a clean 400 response
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      return res.status(400).json({ success: false, error: { message } });
    }
    logger.error('auth', 'Registration error', { error: err.message });
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
});

// @route   POST /api/auth/login
router.post('/login', loginRateLimit, async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { message: 'Please enter all fields' } });
    }

    // F-01/F-12 grace degradation: Fallback to in-memory store if MongoDB is down
    if (mongoose.connection.readyState !== 1) {
      if (!global.mockUsers) global.mockUsers = [];
      const user = global.mockUsers.find(u => u.email === email);
      if (!user) {
        return res.status(400).json({ success: false, error: { message: 'Invalid credentials' } });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: { message: 'Invalid credentials' } });
      }
      const payload = { user: { id: user.id } };
      jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
        if (err) throw err;
        res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
      });
      return;
    }

    // F-11: Explicitly select the password field because it is now hidden by default in the Schema
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ success: false, error: { message: 'Invalid credentials' } });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: { message: 'Invalid credentials' } });
    }

    const payload = { user: { id: user.id } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    });
  } catch (err) {
    logger.error('auth', 'Login error', { error: err.message });
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
});

// @route   GET /api/auth/me
// @desc    Get logged in user
router.get('/me', auth, async (req, res) => {
  try {
    // F-01/F-12 grace degradation: Fallback to in-memory store if MongoDB is down
    if (mongoose.connection.readyState !== 1) {
      if (!global.mockUsers) global.mockUsers = [];
      const user = global.mockUsers.find(u => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }
      const { password, ...safeUser } = user;
      return res.json({ success: true, user: safeUser });
    }

    // F-11: Redundant select('-password') removed as it is now excluded by default in schema definition
    const user = await User.findById(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    logger.error('auth', 'Fetch user error', { error: err.message });
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
});

module.exports = router;
