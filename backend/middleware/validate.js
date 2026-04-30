/**
 * Request validation middleware for NETflash routes.
 */

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

  const supportedDomains = ['amazon.in', 'amazon.com', 'flipkart.com', 'meesho.com'];
  try {
    const parsed = new URL(trimmed);
    const isSupported = supportedDomains.some(d => parsed.hostname.includes(d));
    if (!isSupported) {
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
