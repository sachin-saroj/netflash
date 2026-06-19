const mongoose = require('mongoose');

/**
 * @file Cache.js
 * @description Mongoose schema definition and model for generic data caching.
 * Temporarily persists external API payloads (such as YouTube API responses or
 * marketplace scraper results) to stay within API limit thresholds and enhance reliability.
 */

/**
 * @typedef {Object} Cache
 * @property {string} key - Unique lookup identifier (typically URL-based or query hash). Required and indexed.
 * @property {*} data - Raw serialized JSON data payload. Utilizes Mixed type to accommodate any JSON structure.
 * @property {Date} expiresAt - Absolute timestamp defining when this cache entry becomes stale. Required.
 */
const cacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true }
}, {
  timestamps: true
});

// TTL Behavior: Automatic index purging. MongoDB will delete documents when current time is past expiresAt (expireAfterSeconds: 0).
cacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Cache', cacheSchema);

