const express = require('express');
const router = express.Router();
const { searchYoutubeReviews } = require('../services/youtube');
const { analyzeYoutubeContent } = require('../services/gemini');
const Cache = require('../models/Cache');
const logger = require('../utils/logger');

/**
 * POST /api/youtube
 * Searches YouTube for product reviews and runs sentiment analysis.
 *
 * Request body: { productTitle }
 */
const inMemoryYoutube = new Map();
const inProgressYoutube = new Map();

router.post('/', async (req, res) => {
  const { productTitle } = req.body;

  if (!productTitle) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_TITLE', message: 'Product title is required.' }
    });
  }

  const cacheKey = `youtube:${productTitle.slice(0, 60).replace(/\s+/g, '_').toLowerCase()}`;

  // 1. Check MongoDB Cache (1 hour TTL for YouTube data)
  try {
    const cached = await Cache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } });
    if (cached) {
      logger.info('youtube', 'Returning cached YouTube data from MongoDB', { key: cacheKey });
      return res.json({ success: true, data: cached.data, cached: true });
    }
  } catch (_) {
    logger.warn('youtube', 'Cache lookup failed, continuing');
  }

  // 2. Check In-Memory Cache (1 hour TTL)
  if (inMemoryYoutube.has(cacheKey)) {
    const cached = inMemoryYoutube.get(cacheKey);
    if (cached.expiresAt > Date.now()) {
      logger.info('youtube', 'Returning cached YouTube data from In-Memory Cache', { key: cacheKey });
      return res.json({ success: true, data: cached.data, cached: true });
    } else {
      inMemoryYoutube.delete(cacheKey);
    }
  }

  // 3. Deduplicate concurrent requests
  let youtubePromise;
  if (inProgressYoutube.has(cacheKey)) {
    logger.info('youtube', 'Duplicate YouTube analysis request detected, joining existing execution', { cacheKey });
    youtubePromise = inProgressYoutube.get(cacheKey);
  } else {
    logger.info('youtube', 'Starting new YouTube analysis execution', { cacheKey });
    youtubePromise = (async () => {
      // 1. Search YouTube for review videos
      const videos = await searchYoutubeReviews(productTitle);

      if (!videos || videos.length === 0) {
        return {
          videos: [],
          analysis: null,
          message: 'No YouTube reviews found for this product.'
        };
      }

      // 2. Run Gemini AI analysis on video titles/descriptions for sentiment + sponsored detection
      let analysis = null;
      try {
        analysis = await analyzeYoutubeContent(videos, productTitle);
      } catch (err) {
        logger.warn('youtube', 'YouTube content analysis failed, returning videos without analysis', {
          error: err.message
        });
      }

      // 3. Merge analysis into video objects
      const enrichedVideos = videos.map(video => {
        const videoAnalysis = analysis?.videos?.find(
          a => a.videoId === video.videoId
        );

        return {
          ...video,
          sentiment: videoAnalysis?.sentiment || 'neutral',
          isSponsored: videoAnalysis?.isSponsored || false,
          keyPoints: videoAnalysis?.keyPoints || []
        };
      });

      const result = {
        videos: enrichedVideos,
        analysis: analysis ? {
          overallSentiment: analysis.overallSentiment || 'mixed',
          sponsoredCount: analysis.sponsoredCount || 0,
          summary: analysis.summary || ''
        } : null
      };

      return result;
    })();

    inProgressYoutube.set(cacheKey, youtubePromise);
  }

  try {
    const result = await youtubePromise;

    // Cache for 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    inMemoryYoutube.set(cacheKey, { data: result, expiresAt: expiresAt.getTime() });

    await Cache.findOneAndUpdate(
      { key: cacheKey },
      { key: cacheKey, data: result, expiresAt },
      { upsert: true }
    ).catch(() => {});

    logger.info('youtube', 'YouTube analysis complete', {
      videoCount: result.videos.length,
      sponsored: result.analysis?.sponsoredCount || 0
    });

    return res.json({ success: true, data: result, cached: false });

  } catch (err) {
    logger.error('youtube', 'YouTube analysis failed', { error: err.message });
    inProgressYoutube.delete(cacheKey);
    return res.status(500).json({
      success: false,
      error: {
        code: 'YOUTUBE_FAILED',
        message: 'YouTube analysis failed. Please try again.',
        detail: err.message
      }
    });
  } finally {
    inProgressYoutube.delete(cacheKey);
  }
});

module.exports = router;
