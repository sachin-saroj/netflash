const mongoose = require('mongoose');

/**
 * @file Analysis.js
 * @description Mongoose schema definition and model for product review analysis.
 * Caches generative AI insights, authenticity ratings, and summarized review metadata
 * to minimize LLM token usage and reduce response latency.
 */

/**
 * @typedef {Object} Analysis
 * @property {string} platformId - The product identification code specific to the e-commerce platform (e.g. ASIN for Amazon). Required and indexed.
 * @property {string} platform - The source platform name (e.g. 'amazon', 'flipkart', 'meesho'). Required.
 * @property {number} [trustScore] - Calculated score representing the estimated authenticity of the reviews (0-100 scale).
 * @property {number} [reviewsAnalyzed] - Total number of reviews scraped and analyzed by the Gemini model.
 * @property {number} [genuinePercent] - Percentage of reviews analyzed as genuine/unbiased.
 * @property {number} [suspiciousPercent] - Percentage of reviews flagged with spammy or unnatural patterns.
 * @property {number} [incentivizedPercent] - Percentage of reviews flagged as incentivized (sponsored or compensated).
 * @property {string[]} redFlags - List of specific anomalies found (e.g. burst posting, keywords reuse).
 * @property {string[]} genuineComplaints - Summarized pain points extracted from verified buyers.
 * @property {string[]} genuinePositives - Summarized positive features extracted from verified buyers.
 * @property {string} [verdict] - Final AI-generated textual recommendation or verdict summarizing product trust.
 * @property {Date} createdAt - Document timestamp with a 24-hour TTL (expires: 86400). Automatically purges old records to force re-analysis.
 */
const analysisSchema = new mongoose.Schema({
  platformId: { type: String, required: true, index: true },
  platform: { type: String, required: true },
  trustScore: Number,
  reviewsAnalyzed: Number,
  genuinePercent: Number,
  suspiciousPercent: Number,
  incentivizedPercent: Number,
  redFlags: [String],
  genuineComplaints: [String],
  genuinePositives: [String],
  verdict: String,
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 86400 // TTL Behavior: Automatically purges the cache after 24 hours to ensure review insights remain fresh.
  }
}, {
  timestamps: true
});

// Optimization: Compound index for quick matching on platform and ID queries.
analysisSchema.index({ platformId: 1, platform: 1 });

module.exports = mongoose.model('Analysis', analysisSchema);

