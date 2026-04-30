const express = require('express');
const router = express.Router();
const { extractProductId } = require('../utils/extractProductId');
const { fetchProductDetails } = require('../services/amazon');
const logger = require('../utils/logger');

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { platform } = req.query;

  if (!id || !platform) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: 'Product ID and platform are required' }
    });
  }

  try {
    let productData;
    if (platform === 'amazon') {
      productData = await fetchProductDetails(id);
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'UNSUPPORTED_PLATFORM', message: `Platform "${platform}" is not yet supported` }
      });
    }

    return res.json({ success: true, data: productData, cached: false });
  } catch (err) {
    logger.error('product', 'Product fetch failed', { error: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: err.message }
    });
  }
});

module.exports = router;
