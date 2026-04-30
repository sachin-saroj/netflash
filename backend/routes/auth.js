const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'netflash_super_secret_key_2026';

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: { message: 'Please enter all fields' } });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, error: { message: 'User already exists' } });
    }

    user = new User({ name, email, password });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    });
  } catch (err) {
    logger.error('auth', 'Registration error', { error: err.message });
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { message: 'Please enter all fields' } });
    }

    const user = await User.findOne({ email });
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
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    logger.error('auth', 'Fetch user error', { error: err.message });
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
});

module.exports = router;
