const axios = require('axios');
const logger = require('../utils/logger');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Search YouTube for product review videos using YouTube Data API v3.
 * Returns up to 5 relevant review videos with metadata.
 */
async function searchYoutubeReviews(productTitle) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    logger.warn('youtube', 'YOUTUBE_API_KEY not set, skipping YouTube search');
    return [];
  }

  try {
    // Clean title for better YouTube search results
    const searchQuery = `${cleanTitleForSearch(productTitle)} review India`;

    logger.info('youtube', `Searching YouTube for: "${searchQuery}"`);

    const searchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: 5,
        order: 'relevance',
        relevanceLanguage: 'en',
        regionCode: 'IN',
        videoDuration: 'medium',
        key: apiKey
      },
      timeout: 10000
    });

    const items = searchResponse.data?.items;
    if (!items || items.length === 0) {
      logger.info('youtube', 'No YouTube results found');
      return [];
    }

    // Get video IDs for statistics fetch
    const videoIds = items.map(item => item.id.videoId).filter(Boolean);

    // Fetch video statistics (views, likes, comments)
    let statsMap = {};
    if (videoIds.length > 0) {
      try {
        const statsResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
          params: {
            part: 'statistics,contentDetails',
            id: videoIds.join(','),
            key: apiKey
          },
          timeout: 10000
        });

        statsResponse.data?.items?.forEach(item => {
          statsMap[item.id] = {
            viewCount: parseInt(item.statistics?.viewCount || '0'),
            likeCount: parseInt(item.statistics?.likeCount || '0'),
            commentCount: parseInt(item.statistics?.commentCount || '0'),
            duration: item.contentDetails?.duration || ''
          };
        });
      } catch (err) {
        logger.warn('youtube', 'Failed to fetch video stats', { error: err.message });
      }
    }

    // Map to clean video objects
    const videos = items
      .filter(item => item.id?.videoId)
      .map(item => {
        const videoId = item.id.videoId;
        const stats = statsMap[videoId] || {};
        const snippet = item.snippet;

        return {
          videoId,
          title: snippet.title || '',
          channelName: snippet.channelTitle || '',
          thumbnail: snippet.thumbnails?.high?.url ||
                     snippet.thumbnails?.medium?.url ||
                     snippet.thumbnails?.default?.url || '',
          publishedAt: snippet.publishedAt || '',
          description: (snippet.description || '').slice(0, 300),
          viewCount: stats.viewCount || 0,
          likeCount: stats.likeCount || 0,
          commentCount: stats.commentCount || 0,
          duration: parseDuration(stats.duration || ''),
          url: `https://www.youtube.com/watch?v=${videoId}`
        };
      });

    logger.info('youtube', `Found ${videos.length} YouTube review videos`);
    return videos;

  } catch (err) {
    logger.error('youtube', 'YouTube search failed', { error: err.message });
    return [];
  }
}

/**
 * Clean product title for YouTube search — remove noise, keep meaningful words.
 */
function cleanTitleForSearch(title) {
  return title
    .replace(/\(.*?\)/g, '')              // Remove parenthetical info
    .replace(/\[.*?\]/g, '')              // Remove brackets
    .replace(/,\s*(Black|White|Blue|Red|Green|Grey|Silver|Gold|Pink)\s*/gi, '')  // Remove color variants
    .replace(/[^\w\s-]/g, ' ')            // Remove special chars
    .split(/\s+/)
    .slice(0, 6)                          // Keep first 6 words
    .join(' ')
    .trim();
}

/**
 * Parse ISO 8601 duration (PT12M34S) to human-readable string (12:34).
 */
function parseDuration(isoDuration) {
  if (!isoDuration) return '';

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

module.exports = { searchYoutubeReviews };
