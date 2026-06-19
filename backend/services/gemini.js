const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const { getMockAnalysis } = require('../utils/mockData');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const FAKE_REVIEW_PROMPT = `
You are an expert at detecting fake, paid, and incentivized product reviews on Indian e-commerce platforms.

Analyze the following product reviews carefully. Return ONLY a valid JSON object with this exact structure and nothing else — no markdown, no explanation, no backticks:

{
  "trustScore": <number 1-10, decimal allowed>,
  "reviewsAnalyzed": <number>,
  "genuinePercent": <number 0-100>,
  "suspiciousPercent": <number 0-100>,
  "incentivizedPercent": <number 0-100>,
  "redFlags": [<string>, <string>, <string>],
  "genuineComplaints": [<string>, <string>, <string>],
  "genuinePositives": [<string>, <string>, <string>],
  "productSummary": {
    "overview": "<A detailed 2-3 sentence paragraph summarizing the overall quality and consensus based purely on genuine reviews.>",
    "buildQuality": "<Excellent | Average | Poor | Unknown>",
    "valueForMoney": "<Excellent | Average | Poor | Unknown>",
    "performance": "<Excellent | Average | Poor | Unknown>",
    "targetAudience": "<Short phrase describing who should buy this>"
  },
  "sellerIntel": {
    "riskLevel": "<Safe | Caution | Avoid>",
    "redFlags": [<string>]
  },
  "alternatives": [
    { "name": "<Product Name>", "reason": "<Why it's better>" },
    { "name": "<Product Name>", "reason": "<Why it's better>" }
  ],
  "verdict": "<2-3 sentence buy recommendation. Start with BUY / WAIT / AVOID then platform name if applicable.>"
}

Signals of fake reviews to detect:
- Reviewer has only 1-2 total reviews on platform ever
- Multiple reviews posted within same 3-7 day window (burst pattern)
- Overly generic language: "Great product!", "Very happy!", "Best purchase"
- Product name or model number repeated unnaturally in review text
- No specific usage details — no mention of actual features or experience
- 90%+ five-star with zero 2-3 star reviews (statistically impossible for real products)
- Review text sounds like a marketing copy or product description
- Unnatural English or translation artifacts suggesting template use

Signals of genuine reviews:
- Specific usage scenarios mentioned ("used it during commute", "after 3 months")
- Balanced feedback — mentions both positives and drawbacks
- Reviewer compares to other products they own
- Mentions product-specific technical details

Reviews to analyze:
`;

async function analyzeReviews(reviews, productTitle) {
  const reviewText = reviews
    .slice(0, 200)
    .map((r, i) =>
      `[Review ${i + 1}] Rating: ${r.rating}★ | Reviewer total reviews: ${r.reviewerTotalReviews || 'unknown'} | Verified: ${r.verifiedPurchase || false}\n"${r.text}"`
    )
    .join('\n\n');

  try {
    logger.info('gemini', `Analyzing ${Math.min(reviews.length, 200)} reviews`);
    const result = await model.generateContent(FAKE_REVIEW_PROMPT + reviewText);
    const raw = result.response.text().trim();
    const clean = raw.replace(/```json|```/g, '').trim();

    // F-01: Tag successful AI responses with source metadata so consumers
    // can always distinguish live AI output from demo fallbacks.
    const parsed = JSON.parse(clean);
    parsed.source = 'live';
    parsed.demoMode = false;
    return parsed;
  } catch (err) {
    // F-01 FIX: Return dynamic mock data contextually classified based on the productTitle
    // rather than static boAt Rockerz headphone reviews.
    logger.warn('gemini', 'Gemini unavailable, serving demo analysis', {
      error: err.message,
      reason: 'Returning mock analysis with demoMode=true'
    });

    const mockAnalysis = getMockAnalysis(productTitle);

    return {
      // --- Demo-mode metadata (F-01 addition) ---
      source: 'mock',
      demoMode: true,
      _meta: {
        message: 'Live AI analysis unavailable. Showing demo analysis.',
        failureReason: err.message
      },
      ...mockAnalysis
    };
  }
}

const YOUTUBE_ANALYSIS_PROMPT = `
You are an expert at analyzing YouTube product review videos based on their titles and descriptions.

Analyze the following YouTube videos about a product. Return ONLY a valid JSON object with this exact structure and nothing else — no markdown, no explanation, no backticks:

{
  "overallSentiment": "<positive | negative | mixed>",
  "sponsoredCount": <number of likely sponsored videos>,
  "summary": "<1-2 sentence summary of what YouTube reviewers think overall>",
  "videos": [
    {
      "videoId": "<videoId>",
      "sentiment": "<positive | negative | mixed | neutral>",
      "isSponsored": <true | false>,
      "keyPoints": ["<point 1>", "<point 2>"]
    }
  ]
}

Signals of sponsored content:
- Title contains: "unboxing", "gifted", "collab", "sponsored", "PR sample"
- Description mentions brand sent the product for free
- Overly enthusiastic title with no criticism
- Channel primarily does unboxing/sponsored content

Signals of genuine review:
- "after X months/weeks" in title — long-term usage review
- Mentions both pros and cons
- Comparison with competitors
- "honest review", "real experience" in title

Product being reviewed: `;

async function analyzeYoutubeContent(videos, productTitle) {
  const videoSummaries = videos
    .slice(0, 5)
    .map(v =>
      `[VideoID: ${v.videoId}] Channel: "${v.channelName}" | Title: "${v.title}" | Views: ${v.viewCount} | Description: "${v.description}"`
    )
    .join('\n\n');

  try {
    logger.info('gemini', `Analyzing ${Math.min(videos.length, 5)} YouTube videos`);
    const result = await model.generateContent(
      YOUTUBE_ANALYSIS_PROMPT + productTitle + '\n\nVideos to analyze:\n' + videoSummaries
    );
    const raw = result.response.text().trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    logger.error('gemini', 'YouTube analysis failed', { error: err.message });
    throw new Error(`YouTube analysis failed: ${err.message}`);
  }
}

module.exports = { analyzeReviews, analyzeYoutubeContent };
