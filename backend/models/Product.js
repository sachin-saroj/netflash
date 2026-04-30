const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  platformId: { type: String, required: true, index: true },
  platform: { type: String, required: true, enum: ['amazon', 'flipkart', 'meesho'] },
  title: { type: String, required: true },
  image: String,
  rating: Number,
  reviewCount: Number,
  currentPrice: Number,
  url: String,
  lastFetched: { type: Date, default: Date.now }
}, {
  timestamps: true
});

productSchema.index({ platformId: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
