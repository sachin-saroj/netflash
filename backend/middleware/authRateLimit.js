const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Dedicated rate limiter for login endpoint.
 * Config: max 5 requests per 15 minutes.
 */
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('security', 'Authentication rate limit exceeded - Login', {
      ip: req.ip,
      route: req.originalUrl
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again after 15 minutes.'
      }
    });
  }
});

/**
 * Dedicated rate limiter for registration endpoint.
 * Config: max 10 requests per 1 hour.
 */
const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('security', 'Authentication rate limit exceeded - Register', {
      ip: req.ip,
      route: req.originalUrl
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many accounts created from this IP. Please try again in 1 hour.'
      }
    });
  }
});

module.exports = { loginRateLimit, registerRateLimit };
