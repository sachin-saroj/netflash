/**
 * Request validation middleware for NETflash routes.
 */

/**
 * F-06 HARDENED: Strict domain matching for supported e-commerce platforms.
 *
 * Previous implementation used `hostname.includes('amazon')` which could be
 * bypassed with crafted domains like:
 *   - amazon.in.evil.com  (includes 'amazon' ✓ but is not Amazon)
 *   - flipkart.com.attacker.io
 *   - not-meesho.com
 *
 * Fix: Use exact match or `.endsWith()` to only accept the real domains
 * and their legitimate subdomains (e.g., www.amazon.in, m.flipkart.com).
 */
const { isSupportedDomain } = require('../config/domains');


function validateUrl(req, res, next) {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_URL',
        message: 'A product URL is required.'
      }
    });
  }

  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'URL must be between 1 and 2048 characters.'
      }
    });
  }

  try {
    const parsed = new URL(trimmed);

    // F-06 FIX: Strict protocol check — only allow HTTPS and HTTP
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Only HTTP and HTTPS URLs are supported.'
        }
      });
    }

    // F-06 FIX: Use strict domain matching instead of hostname.includes()
    // to prevent bypass via crafted domains like amazon.in.evil.com
    if (!isSupportedDomain(parsed.hostname)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_PLATFORM',
          message: 'Only Amazon, Flipkart, and Meesho URLs are supported.'
        }
      });
    }
  } catch {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'The provided URL is not valid.'
      }
    });
  }

  req.body.url = trimmed;
  next();
}

module.exports = { validateUrl };
