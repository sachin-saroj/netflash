function extractProductId(url) {
  try {
    const parsed = new URL(url);

    // Amazon: /dp/ASIN or /gp/product/ASIN
    if (parsed.hostname.includes('amazon')) {
      const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
      if (match) return { platform: 'amazon', id: match[1] };
      throw new Error('Could not extract Amazon ASIN from URL');
    }

    // Flipkart: pid parameter or path segment
    if (parsed.hostname.includes('flipkart')) {
      const pidMatch = url.match(/[?&]pid=([A-Z0-9]+)/i);
      if (pidMatch) return { platform: 'flipkart', id: pidMatch[1] };
      const pathMatch = url.match(/\/p\/([a-z0-9]+)/i);
      if (pathMatch) return { platform: 'flipkart', id: pathMatch[1] };
      throw new Error('Could not extract Flipkart PID from URL');
    }

    // Meesho: /product/ID or /slug/p/ID
    if (parsed.hostname.includes('meesho')) {
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
