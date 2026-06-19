/**
 * Cleans and normalizes review data from various platforms
 * into a consistent format for AI analysis.
 */
function cleanReviews(reviews, platform) {
  if (!Array.isArray(reviews)) return [];

  const seen = new Set();
  return reviews
    .filter(r => r && (r.text || r.body || r.review_text || r.content))
    .map(r => {
      const text = (r.text || r.body || r.review_text || r.content || '').trim();

      if (!text || text.length < 10) return null;

      return {
        text: text.slice(0, 1000),
        rating: parseFloat(r.rating || r.stars || r.review_star || 0),
        verifiedPurchase: Boolean(
          r.verified_purchase || r.verifiedPurchase || r.is_verified || false
        ),
        reviewerTotalReviews: r.reviewer_total_reviews || r.reviewerTotalReviews || 'unknown',
        date: r.date || r.review_date || r.created_at || null,
        platform
      };
    })
    .filter(Boolean)
    .filter(r => {
      if (seen.has(r.text)) return false;
      seen.add(r.text);
      return true;
    });
}

module.exports = { cleanReviews };
