const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * F-05 FIX: Rate limiter for the /api/analyze endpoint.
 *
 * This endpoint triggers Gemini AI calls which are expensive ($$$).
 * Without rate limiting, an attacker can send 1000 requests and cause
 * an API bill explosion.
 *
 * Config: 20 requests per 60 minutes per IP address.
 * Stricter than the general limiter because each request burns Gemini tokens.
 */
const analyzeRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour (changed from 15min to match spec: 20 req/hour)
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // F-05: Structured logging on rate limit hit
    logger.warn('security', 'Rate limit exceeded on analyze endpoint', {
      ip: req.ip,
      route: req.originalUrl
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many analysis requests. Please try again in 1 hour.'
      }
    });
  }
});

/**
 * F-05 FIX: General rate limiter for all /api/* endpoints.
 *
 * Provides baseline protection against brute-force attacks, credential stuffing,
 * and general API abuse. Applied globally to all API routes.
 *
 * Config: 100 requests per 15 minutes per IP address.
 */
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // F-05: Structured logging on rate limit hit
    logger.warn('security', 'General rate limit exceeded', {
      ip: req.ip,
      route: req.originalUrl
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.'
      }
    });
  }
});

module.exports = { analyzeRateLimit, generalRateLimit };
