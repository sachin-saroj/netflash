const mongoose = require('mongoose');

/**
 * @file Search.js
 * @description Mongoose schema definition and model for search telemetry.
 * Logs query URL and product analysis requests for system usage auditing,
 * rate limiting, and dashboard analytics.
 */

/**
 * @typedef {Object} Search
 * @property {string} url - The product URL submitted for analysis. Required.
 * @property {string} [platformId] - The extracted platform-specific product identifier.
 * @property {string} [platform] - The identified marketplace (e.g. 'amazon', 'flipkart').
 * @property {string} [ip] - The client IP address triggering the request (PII - GDPR/CCPA implications).
 * @property {string} [userAgent] - The client browser user-agent string.
 * @property {Date} createdAt - Document timestamp with a 7-day TTL (expires: 604800).
 */
const searchSchema = new mongoose.Schema({
  url: { type: String, required: true },
  platformId: String,
  platform: String,
  ip: String, // PII Consideration: Stores user IP addresses. Keep transient to ensure data minimization and compliance.
  userAgent: String,
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 604800 // TTL Behavior: Automatically purges query logs after 7 days to protect user privacy.
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Search', searchSchema);

