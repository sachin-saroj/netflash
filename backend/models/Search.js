const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema({
  url: { type: String, required: true },
  platformId: String,
  platform: String,
  ip: String,
  userAgent: String,
  createdAt: { type: Date, default: Date.now, expires: 604800 }
}, {
  timestamps: true
});

searchSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Search', searchSchema);
