const mongoose = require('mongoose');

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
  createdAt: { type: Date, default: Date.now, expires: 86400 }
}, {
  timestamps: true
});

analysisSchema.index({ platformId: 1, platform: 1 });
analysisSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Analysis', analysisSchema);
