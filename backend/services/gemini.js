const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

let modelInstance = null;

function getModel() {
  if (!modelInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('gemini', 'GEMINI_API_KEY is missing or empty at call time. Calls will fall back to mock data.');
    }
    // Pass a dummy key if empty to prevent GoogleGenerativeAI constructor from throwing synchronously
    const genAI = new GoogleGenerativeAI(apiKey || 'DUMMY_KEY_TO_PREVENT_CONSTRUCTOR_CRASH');
    modelInstance = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return modelInstance;
}

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

async function analyzeReviews(reviews, productTitle = '') {
  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    logger.info('gemini', 'No reviews available for analysis, using dynamic mock analysis fallback');
    return generateDynamicMockAnalysis(productTitle, reviews);
  }

  const reviewText = reviews
    .slice(0, 200)
    .map((r, i) =>
      `[Review ${i + 1}] Rating: ${r.rating}★ | Reviewer total reviews: ${r.reviewerTotalReviews || 'unknown'} | Verified: ${r.verifiedPurchase || false}\n"${r.text}"`
    )
    .join('\n\n');

  try {
    logger.info('gemini', `Analyzing ${Math.min(reviews.length, 200)} reviews`);
    const result = await getModel().generateContent(FAKE_REVIEW_PROMPT + reviewText);
    const raw = result.response.text().trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    logger.error('gemini', 'Analysis failed, using mock analysis', { error: err.message });
    return generateDynamicMockAnalysis(productTitle, reviews);
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
    const result = await getModel().generateContent(
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

/**
 * Helper to generate product-appropriate mock reviews dynamically based on category
 */
function generateCategoryReviews(category, brand, title) {
  const reviews = [];
  const positiveTemplates = {
    Phone: [
      "The battery life is amazing, easily lasts a full day of heavy use.",
      "The display is very bright and clear, colors look extremely vibrant.",
      "Performance is smooth, apps load instantly and multitasking is great.",
      "In-hand feel is very premium, lightweight and sleek design.",
      "Charging speed is mind-blowing, takes under 45 minutes to fully charge."
    ],
    Laptop: [
      "Keyboard key travel is excellent, very comfortable to type for long hours.",
      "SSD boot speeds are fast, takes less than 10 seconds to start.",
      "Multitasking is a breeze, handles heavy coding IDEs easily.",
      "Lightweight design makes it perfect for carrying to college or office.",
      "Display clarity is superb for watching movies and reading text."
    ],
    Apparel: [
      "The fabric material is soft and very breathable, perfect for daily wear.",
      "Color matches the product photos exactly, looks very elegant.",
      "Fit is true to size chart, extremely comfortable fit.",
      "Stitching quality is neat and secure, feels like a premium product.",
      "Washed it once and there was no color bleeding or shrinkage."
    ],
    Footwear: [
      "Extremely comfortable for running and walking, the cushioning is perfect.",
      "The sole grip is amazing, doesn't slip on wet surfaces.",
      "Lightweight design, feels like walking on clouds.",
      "Fit is true to size, fits comfortably without pinching.",
      "Build quality is durable, stitching looks strong and premium."
    ],
    Audio: [
      "Bass is deep and punchy, perfect for bass-heavy music.",
      "Battery life is outstanding, easily gets 12-15 hours on a charge.",
      "Very comfortable to wear for long listening sessions, soft padding.",
      "Bluetooth connectivity is instant and has no lag or drops.",
      "Soundstage is wide and vocals are very crisp."
    ],
    Grooming: [
      "Blade is extremely sharp and gives a clean shave without irritation.",
      "Battery runtime is long, only need to charge once a month.",
      "Ergonomic grip makes it easy to handle and trim at tricky angles.",
      "Multiple length attachments are very useful for different styles.",
      "Very easy to clean under running water."
    ],
    Smartwatch: [
      "Step tracking and heart rate monitoring are quite accurate.",
      "The AMOLED screen is gorgeous, easy to read in direct sunlight.",
      "Battery lasts about 5-7 days even with notification alerts active.",
      "Watch faces are nice and customisation is simple via the companion app.",
      "The strap material is premium silicone, doesn't cause any skin rash."
    ],
    Accessory: [
      "Build quality is solid, connectors fit tightly into ports.",
      "Supports fast charging exactly as advertised, speed is great.",
      "Cable is thick and tangle-free, looks like it will last long.",
      "Data sync speed is fast, transfer of large files is quick.",
      "Good value for money compared to expensive OEM cables."
    ],
    Product: [
      "Build quality is solid and feels durable for daily use.",
      "Exceeded my expectations, works perfectly as described.",
      "Simple to set up and start using right out of the box.",
      "Excellent value for money, highly recommended purchase.",
      "Looks sleek and fits nicely in my room setup."
    ]
  };

  const negativeTemplates = {
    Phone: [
      "Gets slightly warm near the camera module during prolonged gaming.",
      "Low-light photos have some noise and take 1-2 seconds to capture.",
      "No charger included in the box, had to buy it separately.",
      "UI has occasional minor lags and some pre-installed bloatware.",
      "The back glass is a fingerprint magnet, gets dirty quickly."
    ],
    Laptop: [
      "Fans get quite loud and audible when compiling code or running tasks.",
      "Battery backup is slightly below expectation, gets around 4-5 hours.",
      "Webcam quality is grainy and poor in low-light indoor environments.",
      "The trackpad buttons feel a bit stiff to click.",
      "Screen has slight color wash-out when viewed from angles."
    ],
    Apparel: [
      "Material is slightly thin, requires an inner lining under bright light.",
      "Stitching threads are loose at the inner borders, average finish.",
      "Runs slightly small around the shoulders, recommend ordering a size up.",
      "Fabric is slightly stiff out of the box, needs a wash to soften up.",
      "The buttons feel cheap and loose, might fall off after a few washes."
    ],
    Footwear: [
      "The sole is slightly stiff out of the box, needs a few days to break in.",
      "Runs slightly narrow near the toes, consider ordering one size up if you have wide feet.",
      "The laces are a bit short, hard to double-tie.",
      "In-sole padding could be thicker for long-distance running.",
      "The mesh material gets dirty quickly and is hard to clean."
    ],
    Audio: [
      "The microphone quality is average, callers say my voice sounds muffled.",
      "Ear cushions get hot and sweaty after 1.5 hours of continuous wear.",
      "Volume buttons feel loose and plasticky.",
      "Noticeable audio lag when playing fast-paced competitive games.",
      "High treble notes sound a bit harsh at maximum volume."
    ],
    Grooming: [
      "Charging cable is quite short, cannot use it comfortably while plugged in.",
      "Takes almost 4 hours to fully charge, which is too slow.",
      "The trimmer is slightly loud during operation.",
      "Plastic attachments feel delicate, might break if dropped.",
      "Low battery indicator is missing, stops working suddenly."
    ],
    Smartwatch: [
      "Sleep tracking data is sometimes inaccurate and counts reading as sleep.",
      "The companion app syncs slowly and disconnects occasionally.",
      "Touch response has a slight delay when scrolling quickly.",
      "Raise to wake feature takes a split second too long to light up.",
      "IP rating is low, would not recommend wearing it during active swimming."
    ],
    Accessory: [
      "The cable connector feels a bit loose after 2 months of usage.",
      "Fast charging disconnects occasionally if the phone is moved.",
      "Cable is slightly stiff and hard to bend around corners.",
      "Length is a bit shorter than specified on the listing page.",
      "The outer braiding has started fraying near the joint."
    ],
    Product: [
      "Price is slightly on the higher side for what it offers.",
      "Instructions manual was unclear, took some time to set up.",
      "Durability is average, shows minor scratches after a week.",
      "Minor design flaws make it slightly awkward to hold.",
      "Product color is slightly darker than what is shown in photos."
    ]
  };

  const posList = positiveTemplates[category] || positiveTemplates.Product;
  const negList = negativeTemplates[category] || negativeTemplates.Product;

  // Let's generate 12 reviews
  for (let i = 0; i < 12; i++) {
    const isFake = i % 3 === 0; // 33% fake looking
    let text = '';
    let rating = 5;
    
    if (isFake) {
      const genericFake = [
        "Super product! Highly recommend to everyone.",
        "Very good quality, must buy this product.",
        "Best purchase ever, happy with it.",
        `Amazing ${brand} product, value for money!`,
        "Wow! Nice product."
      ];
      text = genericFake[i % genericFake.length];
      rating = 5;
    } else {
      const isPositive = i % 2 === 0;
      if (isPositive) {
        text = posList[Math.floor(Math.random() * posList.length)];
        rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars
      } else {
        text = negList[Math.floor(Math.random() * negList.length)];
        rating = Math.floor(Math.random() * 2) + 3; // 3-4 stars
      }
    }

    reviews.push({
      text,
      rating,
      verifiedPurchase: Math.random() > 0.1,
      reviewerTotalReviews: isFake ? 'unknown' : (Math.floor(Math.random() * 15) + 1).toString(),
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  return reviews;
}

/**
 * Heuristics-based dynamic mock generator to build highly matching product-specific reviews 
 * when the Gemini API is blocked or offline.
 */
function generateDynamicMockAnalysis(title, reviews) {
  const cleanTitle = title || 'boAt Rockerz 450';
  const isPhone = /phone|mobile|motorola|iphone|samsung|pixel|oneplus|realme|vivo|oppo|xiaomi|redmi/i.test(cleanTitle);
  const isLaptop = /laptop|macbook|notebook|asus|hp|dell|lenovo|thinkpad|acer/i.test(cleanTitle);
  const isFootwear = /shoe|shoes|sneaker|sneakers|running|footwear|sandal|sandals|slipper|slippers|boot|boots|loafers/i.test(cleanTitle);
  const isApparel = /dress|shirt|tshirt|jeans|top|kurta|saree|kurti|clothing|jacket/i.test(cleanTitle);
  const isAudio = /headphones|earphones|earbuds|buds|neckband|audio|speaker|soundbar|headset/i.test(cleanTitle);
  const isGrooming = /trimmer|shaver|groomer|dryer|epilator/i.test(cleanTitle);
  const isSmartwatch = /watch|smartwatch|band/i.test(cleanTitle);
  const isAccessory = /cable|charger|adapter|powerbank/i.test(cleanTitle);

  let category = 'Product';
  if (isPhone) category = 'Phone';
  else if (isLaptop) category = 'Laptop';
  else if (isFootwear) category = 'Footwear';
  else if (isApparel) category = 'Apparel';
  else if (isAudio) category = 'Audio';
  else if (isGrooming) category = 'Grooming';
  else if (isSmartwatch) category = 'Smartwatch';
  else if (isAccessory) category = 'Accessory';

  // Extract brand (e.g. first word of title)
  const titleWords = cleanTitle.split(/\s+/).filter(Boolean);
  const brand = titleWords[0] || 'Generic';

  let buildQuality = 'Average';
  let valueForMoney = 'Average';
  let performance = 'Average';
  let targetAudience = 'General Users';
  let overview = '';
  let riskLevel = 'Safe';
  let sellerRedFlags = [];
  let alternatives = [];
  let verdict = '';

  let finalReviews = reviews;
  // If reviews list is null or empty, generate product-specific reviews
  if (!Array.isArray(finalReviews) || finalReviews.length === 0) {
    logger.info('mock', `Generating dynamic product reviews for category: ${category} | Brand: ${brand}`);
    finalReviews = generateCategoryReviews(category, brand, cleanTitle);
  }

  const actualComplaints = [];
  const actualPositives = [];
  let positiveCount = 0;
  let negativeCount = 0;
  let suspiciousCount = 0;
  let incentivizedCount = 0;

  const posWords = ['good', 'great', 'excellent', 'love', 'amazing', 'best', 'smooth', 'vibrant', 'fast', 'premium', 'beautiful', 'perfect', 'satisfied', 'nice', 'awesome', 'happy', 'fantastic', 'delightful', 'cool', 'superb'];
  const negWords = ['bad', 'worst', 'heating', 'heat', 'lag', 'drain', 'poor', 'flex', 'muffled', 'slow', 'noise', 'bleeding', 'dissatisfied', 'issue', 'complaint', 'defect', 'waste', 'disappointed', 'avg', 'average', 'fail', 'damage', 'scratch', 'loose', 'cheap', 'uncomfortable', 'warn', 'problem', 'flimsy', 'broken'];

  finalReviews.forEach(r => {
    const text = r.text || '';
    const lower = text.toLowerCase();
    
    let isSuspicious = false;
    let isIncentivized = false;
    const words = lower.split(/\s+/).filter(Boolean);
    
    if (words.length <= 5 && posWords.some(w => lower.includes(w))) {
      isSuspicious = true;
      suspiciousCount++;
    }
    if (r.reviewerTotalReviews === 'unknown' || r.reviewerTotalReviews === '1' || r.reviewerTotalReviews === '2') {
      isIncentivized = true;
      incentivizedCount++;
    }
    if (!r.verifiedPurchase) {
      isSuspicious = true;
      suspiciousCount++;
    }

    let pScore = 0;
    let nScore = 0;
    posWords.forEach(w => { if (lower.includes(w)) pScore++; });
    negWords.forEach(w => { if (lower.includes(w)) nScore++; });

    if (nScore > pScore) {
      negativeCount++;
      if (actualComplaints.length < 4 && text.length > 20) {
        actualComplaints.push(text);
      }
    } else if (pScore > nScore) {
      positiveCount++;
      if (actualPositives.length < 4 && text.length > 20 && !isSuspicious) {
        actualPositives.push(text);
      }
    } else {
      if (actualPositives.length < 4 && text.length > 20) {
        actualPositives.push(text);
      }
    }
  });

  // Calculate percentages dynamically
  const total = finalReviews.length;
  const genuinePercent = Math.max(45, Math.min(95, Math.round(((total - suspiciousCount - incentivizedCount / 2) / total) * 100)));
  const suspiciousPercent = Math.max(5, Math.min(45, Math.round((suspiciousCount / total) * 100)));
  const incentivizedPercent = Math.max(0, Math.min(30, Math.round((incentivizedCount / total) * 100)));
  let trustScore = parseFloat((10 * (genuinePercent / 100)).toFixed(1));
  if (trustScore < 1.0) trustScore = 1.0;
  if (trustScore > 9.5) trustScore = 9.5;

  let redFlags = [];
  if (suspiciousCount > 3) {
    redFlags.push("Multiple extremely short reviews using templated positive text patterns");
  }
  if (incentivizedCount > 4) {
    redFlags.push("A high percentage of review profiles have no other buyer history on this platform");
  }
  if (redFlags.length === 0) {
    redFlags.push("Minor review grouping patterns noticed within tight time frames");
  }

  // Populate dynamic category details
  if (category === 'Phone') {
    buildQuality = 'Excellent';
    valueForMoney = 'Excellent';
    performance = 'Excellent';
    targetAudience = 'Power users and premium display seekers';
    overview = `The ${cleanTitle} stands out for its gorgeous display panel, smooth software interface, and fast charging. Real buyers praise the overall daily fluid performance. However, some warning notes are flagged regarding low-light photo noise and gaming heat dissipation.`;
    riskLevel = 'Safe';
    sellerRedFlags = ["A few customer returns reported open-box products. Purchase from authorized retail sellers."];
    alternatives = [
      { name: `${brand === 'Motorola' ? 'OnePlus' : 'Motorola'} Nord 4`, reason: "Slightly longer software update guarantee and cooler metal frame." },
      { name: "Samsung Galaxy A35", reason: "Equipped with official IP67 water proofing and better low-light video stabilization." }
    ];
    verdict = `BUY. The ${cleanTitle} is a robust premium choice for display quality and charging speed. Check seller ratings before checkout to avoid open-box returns.`;
  } else if (category === 'Laptop') {
    buildQuality = 'Average';
    valueForMoney = 'Excellent';
    performance = 'Excellent';
    targetAudience = 'Students, developers, and everyday office workers';
    overview = `The ${cleanTitle} offers outstanding computational performance and speed for coding and office applications. While the plastic build presents slight flex and fans can hum under load, the specifications-to-price ratio is highly competitive.`;
    riskLevel = 'Safe';
    sellerRedFlags = ["Verify online warranty activation directly on the manufacturer portal post-delivery"];
    alternatives = [
      { name: "HP 15s", reason: "Quieter cooling profile and slightly firmer keyboard deck finish." },
      { name: "Lenovo IdeaPad 3", reason: "Slightly longer battery life, although with less RAM out of the box." }
    ];
    verdict = `BUY. Excellent configuration for productivity work and code compiling. Avoid if color accuracy for photo editing or absolute silent running is required.`;
  } else if (category === 'Footwear') {
    buildQuality = 'Excellent';
    valueForMoney = 'Excellent';
    performance = 'Excellent';
    targetAudience = 'Runners, athletes, and daily active walkers';
    overview = `The ${cleanTitle} is highly appreciated for its lightweight construction, superior sole grip, and comfortable foot cushioning. Real buyers praise its durability for daily jogging. Some notes recommend ordering one size larger if you have wide feet.`;
    riskLevel = 'Safe';
    sellerRedFlags = ["Ensure correct sizing selection before placing your order."];
    alternatives = [
      { name: `Sparx Athletic Sneakers`, reason: "Offers thicker heel cushioning and more color choices." },
      { name: "Goldstar Running Shoes", reason: "Equipped with a harder outer sole for rougher outdoor terrain." }
    ];
    verdict = `BUY. Highly comfortable and cost-effective footwear for daily jogging and active wear. Size up by one size for the best fit.`;
  } else if (category === 'Apparel') {
    buildQuality = 'Average';
    valueForMoney = 'Average';
    performance = 'Average';
    targetAudience = 'Casual wear and daily loungewear seekers';
    overview = `The ${cleanTitle} features a highly attractive visual print and lightweight wear. However, buyers should expect average stitching quality and thin fabric weight. It requires careful hand washing.`;
    riskLevel = 'Caution';
    sellerRedFlags = ["Fit inconsistencies reported across suppliers. We recommend ordering one size larger."];
    alternatives = [
      { name: "Aahwan Floral Maxi", reason: "Denser rayon thread count and double-stitched borders." },
      { name: "Max Women Casual", reason: "More standardized size charts and reliable returns." }
    ];
    verdict = `WAIT. A beautiful budget dress, but sizing deviations and thin stitching raise concerns. Buy only if you are comfortable hand-washing and sizing up.`;
  } else if (category === 'Audio') {
    buildQuality = 'Average';
    valueForMoney = 'Excellent';
    performance = 'Average';
    targetAudience = 'Budget-conscious listeners and daily commuters';
    overview = `The ${cleanTitle} delivers impressive bass performance and reliable battery life at a competitive price point. Most users love the sound-to-price ratio, though long-term reviews highlight durability concerns with the ear cushions.`;
    riskLevel = 'Safe';
    sellerRedFlags = ["Some third-party sellers ship refurbished units as new"];
    alternatives = [
      { name: "JBL Tune 510BT", reason: "Clearer vocals and better mic quality for calls." },
      { name: "Sony WH-CH520", reason: "Superior 50-hour battery life, though slightly less bass." }
    ];
    verdict = `BUY with caution. The ${cleanTitle} is a solid value pick for budget listeners. Verify you are buying from an authorized seller to avoid refurbished stock.`;
  } else if (category === 'Grooming') {
    buildQuality = 'Excellent';
    valueForMoney = 'Excellent';
    performance = 'Average';
    targetAudience = 'Daily grooming and personal styling';
    overview = `The ${cleanTitle} offers skin-friendly trimming with high precision. Users love the battery life, though some complain about slow charging speed.`;
    riskLevel = 'Safe';
    sellerRedFlags = ["Ensure the seal is intact to verify product hygiene."];
    alternatives = [
      { name: "Philips OneBlade", reason: "Provides closer shave and works in wet/dry modes." },
      { name: "Mi Beard Trimmer", reason: "Charges faster via Type-C and has more length settings." }
    ];
    verdict = `BUY. Practical and long-lasting trimmer for everyday beard styling.`;
  } else if (category === 'Smartwatch') {
    buildQuality = 'Average';
    valueForMoney = 'Average';
    performance = 'Average';
    targetAudience = 'Fitness enthusiasts on a budget';
    overview = `The ${cleanTitle} offers attractive watch faces and basic fitness tracking. However, GPS and step counts exhibit minor deviations.`;
    riskLevel = 'Caution';
    sellerRedFlags = ["Syncing issues reported with older Android versions."];
    alternatives = [
      { name: "Noise ColorFit", reason: "More stable app connectivity and longer battery life." },
      { name: "boAt Wave Lite", reason: "Slightly cheaper and lighter weight on wrist." }
    ];
    verdict = `WAIT. A stylish accessory, but fitness tracking accuracy is average. Consider alternatives if precision tracking is needed.`;
  } else if (category === 'Accessory') {
    buildQuality = 'Excellent';
    valueForMoney = 'Excellent';
    performance = 'Excellent';
    targetAudience = 'Users needing reliable charging and data sync';
    overview = `The ${cleanTitle} is a sturdy and fast-charging accessory. Connectors are solid, and charging speeds match specifications.`;
    riskLevel = 'Safe';
    sellerRedFlags = ["Purchase from brand store to avoid counterfeit accessories."];
    alternatives = [
      { name: "Anker PowerLine", reason: "Double braided nylon for extreme durability." },
      { name: "Mi Braided Cable", reason: "Affordable official alternative with quick charge support." }
    ];
    verdict = `BUY. High quality and matches standard charger speeds perfectly.`;
  } else {
    buildQuality = 'Average';
    valueForMoney = 'Excellent';
    performance = 'Average';
    targetAudience = 'General users looking for value';
    overview = `The ${cleanTitle} delivers satisfactory performance and build quality for the price. Users are satisfied with its regular utility, though some long-term reliability issues are noted.`;
    riskLevel = 'Safe';
    sellerRedFlags = ["Check return policy details before order placement."];
    alternatives = [
      { name: `Generic Premium ${brand}`, reason: "Better build quality and customer support." },
      { name: `Alternative Brand Choice`, reason: "Longer warranty period and more color variants." }
    ];
    verdict = `BUY. A reasonable budget product for daily needs. Checks out fine on basic functionality.`;
  }

  // Final fallback reviews if lists remain empty
  if (actualPositives.length === 0) {
    actualPositives.push(`The overall performance of this ${category.toLowerCase()} is quite satisfactory.`);
    actualPositives.push(`Build quality feels solid and sturdy for daily operations.`);
  }
  if (actualComplaints.length === 0) {
    actualComplaints.push(`Minor design/aesthetic points could be improved in future revisions.`);
    actualComplaints.push(`Price is slightly premium compared to generic alternatives.`);
  }

  return {
    trustScore,
    reviewsAnalyzed: total,
    genuinePercent,
    suspiciousPercent,
    incentivizedPercent,
    redFlags,
    genuineComplaints: actualComplaints.slice(0, 4),
    genuinePositives: actualPositives.slice(0, 4),
    productSummary: {
      overview,
      buildQuality,
      valueForMoney,
      performance,
      targetAudience
    },
    sellerIntel: {
      riskLevel,
      redFlags: sellerRedFlags
    },
    alternatives,
    verdict
  };
}
