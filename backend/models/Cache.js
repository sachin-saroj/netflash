const mongoose = require('mongoose');

const cacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true, index: true }
}, {
  timestamps: true
});

cacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Cache', cacheSchema);
