const express = require('express');
const router = express.Router();
const Watchlist = require('../models/Watchlist');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// @route   GET /api/watchlist
// @desc    Get all saved items for user
router.get('/', auth, async (req, res) => {
  try {
    // F-01/F-12 grace degradation: Fallback to in-memory store if MongoDB is down
    if (mongoose.connection.readyState !== 1) {
      if (!global.mockWatchlist) global.mockWatchlist = [];
      const items = global.mockWatchlist.filter(item => item.user === req.user.id);
      return res.json({ success: true, data: items });
    }

    const items = await Watchlist.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    logger.error('watchlist', 'Fetch error', { error: err.message });
    res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
});

// @route   POST /api/watchlist
// @desc    Save an item to watchlist
router.post('/', auth, async (req, res) => {
  const { productId, platform, title, image, currentPrice, url } = req.body;

  try {
    // F-01/F-12 grace degradation: Fallback to in-memory store if MongoDB is down
    if (mongoose.connection.readyState !== 1) {
      if (!global.mockWatchlist) global.mockWatchlist = [];
      let item = global.mockWatchlist.find(i => i.user === req.user.id && i.productId === productId && i.platform === platform);
      if (item) {
        return res.status(400).json({ success: false, error: { message: 'Item already in watchlist' } });
      }
      item = {
        _id: `mock-watch-${Date.now()}`,
        user: req.user.id,
        productId,
        platform,
        title,
        image,
        savedPrice: currentPrice,
        url,
        createdAt: new Date().toISOString()
      };
      global.mockWatchlist.push(item);
      return res.json({ success: true, data: item });
    }

    // Check if already exists
    let item = await Watchlist.findOne({ user: req.user.id, productId, platform });
    if (item) {
      return res.status(400).json({ success: false, error: { message: 'Item already in watchlist' } });
    }

    item = new Watchlist({
      user: req.user.id,
      productId,
      platform,
      title,
      image,
      savedPrice: currentPrice,
      url
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error('watchlist', 'Save error', { error: err.message });
    res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
});

// @route   DELETE /api/watchlist/:id
// @desc    Remove item from watchlist
router.delete('/:id', auth, async (req, res) => {
  try {
    // F-01/F-12 grace degradation: Fallback to in-memory store if MongoDB is down
    if (mongoose.connection.readyState !== 1) {
      if (!global.mockWatchlist) global.mockWatchlist = [];
      const index = global.mockWatchlist.findIndex(i => i._id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: { message: 'Item not found' } });
      }
      const item = global.mockWatchlist[index];
      if (item.user !== req.user.id) {
        return res.status(401).json({ success: false, error: { message: 'Not authorized' } });
      }
      global.mockWatchlist.splice(index, 1);
      return res.json({ success: true, data: { id: req.params.id } });
    }

    const item = await Watchlist.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, error: { message: 'Item not found' } });
    }

    // Make sure user owns item
    if (item.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: { message: 'Not authorized' } });
    }

    await item.deleteOne();
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    logger.error('watchlist', 'Delete error', { error: err.message });
    res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
});

module.exports = router;
