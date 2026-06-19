/**
 * F-06 HARDENED: Strict domain matching for supported e-commerce platforms.
 *
 * Previous implementation used `hostname.includes('amazon')` which could be
 * bypassed with crafted domains like amazon.in.evil.com.
 * Now uses exact match or `.endsWith('.domain')` pattern.
 */
const { SUPPORTED_DOMAINS_MAP: SUPPORTED_DOMAINS, matchesPlatform } = require('../config/domains');


function extractProductId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }

    // Amazon: /dp/ASIN or /gp/product/ASIN
    // F-06 FIX: hostname.includes('amazon') → strict domain match
    if (matchesPlatform(parsed.hostname, SUPPORTED_DOMAINS.amazon)) {
      const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
      if (match) return { platform: 'amazon', id: match[1] };
      throw new Error('Could not extract Amazon ASIN from URL');
    }

    // Flipkart: pid parameter or path segment
    // F-06 FIX: hostname.includes('flipkart') → strict domain match
    if (matchesPlatform(parsed.hostname, SUPPORTED_DOMAINS.flipkart)) {
      const pidMatch = url.match(/[?&]pid=([A-Z0-9]+)/i);
      if (pidMatch) return { platform: 'flipkart', id: pidMatch[1] };
      const pathMatch = url.match(/\/p\/([a-z0-9]+)/i);
      if (pathMatch) return { platform: 'flipkart', id: pathMatch[1] };
      throw new Error('Could not extract Flipkart PID from URL');
    }

    // Meesho: /product/ID or /slug/p/ID
    // F-06 FIX: hostname.includes('meesho') → strict domain match
    if (matchesPlatform(parsed.hostname, SUPPORTED_DOMAINS.meesho)) {
      // Pattern: /p/9cejj4 (alphanumeric ID after /p/)
      const pMatch = url.match(/\/p\/([a-z0-9]+)/i);
      if (pMatch) return { platform: 'meesho', id: pMatch[1] };
      // Pattern: /product/123456 (numeric ID)
      const prodMatch = url.match(/\/product\/([a-z0-9]+)/i);
      if (prodMatch) return { platform: 'meesho', id: prodMatch[1] };
      // Pattern: trailing /123456
      const numMatch = url.match(/\/(\d+)\/?(?:\?|$)/);
      if (numMatch) return { platform: 'meesho', id: numMatch[1] };
      throw new Error('Could not extract Meesho product ID from URL');
    }

    throw new Error('URL is not from a supported platform (Amazon, Flipkart, Meesho)');
  } catch (err) {
    if (err.message.includes('Invalid URL')) {
      throw new Error('The provided URL is not valid');
    }
    throw err;
  }
}

module.exports = { extractProductId };
