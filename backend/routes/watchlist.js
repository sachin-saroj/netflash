const express = require('express');
const router = express.Router();
const Watchlist = require('../models/Watchlist');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// @route   GET /api/watchlist
// @desc    Get all saved items for user
router.get('/', auth, async (req, res) => {
  try {
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
