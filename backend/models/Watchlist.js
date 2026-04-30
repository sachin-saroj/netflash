const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  savedPrice: {
    type: Number,
    required: true
  },
  targetPrice: {
    type: Number, // Optional: User can set an alert threshold
  },
  url: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// A user can only save a specific product once
watchlistSchema.index({ user: 1, productId: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
