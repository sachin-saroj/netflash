const logger = require('./logger');

/**
 * Platform-specific product catalogs for realistic demo data.
 * These make screenshots look like real product analyses.
 */
const PRODUCT_CATALOG = {
  amazon: {
    title: 'boAt Rockerz 450 Bluetooth On-Ear Headphones with Mic, Upto 15 Hours Playback, Padded Ear Cushions, Integrated Controls (Luscious Black)',
    image: 'http://localhost:5173/images/boat-rockerz-450.png',
    rating: 4.1,
    reviewCount: 148723,
    currentPrice: 1299,
  },
  flipkart: {
    title: 'ASUS VivoBook 15 (2022), 15.6-inch FHD, Intel Core i5-1235U 12th Gen, Thin and Light Laptop (16GB/512GB SSD/Win 11/Silver/1.7 kg)',
    image: 'https://rukminim2.flixcart.com/image/416/416/xif0q/computer/v/o/n/-original-imah4j4zcgfchqaz.jpeg',
    rating: 4.3,
    reviewCount: 2347,
    currentPrice: 47990,
  },
  meesho: {
    title: 'Stylish Floral Printed Fit and Flare Maxi Dress for Women, Rayon Fabric, V-Neck, Full Sleeves - Maroon',
    image: 'https://images.meesho.com/images/products/76018768/xb76g_512.webp',
    rating: 3.9,
    reviewCount: 12456,
    currentPrice: 499,
  }
};

/**
 * Platform-specific review pools with realistic text.
 */
const REVIEW_POOLS = {
  amazon: {
    genuine: [
      "Been using these headphones daily for 3 months. Sound quality is great for the price — bass is punchy, mids are clear. Only complaint: ear cushions get warm after 1.5 hours. Battery easily lasts 12+ hours.",
      "Decent build quality for Rs 1299. Compared to my old Sony WH-CH510, the bass is heavier but the vocals aren't as crisp. Good buy if you prioritize bass.",
      "Got this as a gift for my brother. He loves it. Bluetooth range is about 8-10 meters. One issue — the mic quality on calls is average, people say my voice sounds muffled.",
      "Comfortable fit, doesn't press too hard. The foldable design is nice for travel. I use it during gym and it stays on. However, the volume buttons feel slightly loose.",
      "After 6 months, the left ear cup has developed a slight rattle at high volume. Otherwise still works fine. Customer support replaced it under warranty within a week.",
      "I compared this with JBL Tune 510BT side by side. boAt has more bass, JBL has better clarity. For the Rs 1299 price point, this is hard to beat honestly.",
      "Delivery was on time. Packaging was good. The headphones look exactly like the product images. ANC is not present despite what some reviews claim — it is passive noise isolation only."
    ],
    fake: [
      "Best product ever!!! Must buy!!! 5 stars!!!",
      "Amazing quality amazing sound amazing everything. Recommended 100%.",
      "Very good. Nice. Love it. Perfect.",
      "boAt Rockerz 450 is the best headphone in the world. Buy now.",
      "Wow what an incredible headphone, buying 3 more for family."
    ]
  },
  flipkart: {
    genuine: [
      "Running well after 2 months. The i5-1235U handles VS Code, Chrome with 20+ tabs, and Spotify simultaneously without any lag. Fan noise is noticeable during heavy compilation though.",
      "Display is FHD but the color accuracy is average — not ideal for photo editing. For coding and office work it is perfectly fine. Weighs about 1.7kg which is manageable.",
      "Battery life is disappointing — getting about 5 hours max on medium brightness with light usage. ASUS advertised 6-7 hours. The charger is 65W and charges fast though.",
      "Keyboard has decent travel and the keys don't feel mushy. The touchpad is smooth. Only downside — no backlit keyboard which is annoying in low light.",
      "Upgraded from an old i3 laptop, the difference is night and day. 16GB RAM makes multitasking buttery smooth. SSD boot time is around 12 seconds.",
      "Build quality is mostly plastic but doesn't feel flimsy. The hinge feels sturdy. Port selection is good — USB-C, HDMI, 2x USB-A. No Thunderbolt though."
    ],
    fake: [
      "Best laptop ever!!! Super fast amazing quality!!!",
      "ASUS is the best brand. This laptop is incredible. 5 out of 5.",
      "Very nice laptop good performance.",
      "Excellent product delivered on time great quality."
    ]
  },
  meesho: {
    genuine: [
      "The fabric is okay for the price. It is rayon but feels a bit thin — not what I expected from the pictures. Color is accurate though.",
      "Fits well on me (M size, 5 ft 4 in). The floral print is pretty. Washed it twice, no color fading so far. But the stitching near the neckline looks slightly uneven.",
      "Arrived in 5 days. Packaging was just a polythene bag, no box. The dress itself is fine for casual wear but not for any formal occasion.",
      "I ordered maroon, received maroon. The material is breathable which is nice for summer. Length is good — goes till my ankles.",
      "Return was a hassle. The size chart was misleading — ordered L but it was too tight. Meesho customer support took 4 days to initiate the return."
    ],
    fake: [
      "Beautiful dress!!! Best on Meesho!! Buying more colors!!",
      "Very nice looking and exactly as shown. Perfect perfect perfect.",
      "Love it!! Amazing quality!! Must buy for everyone!!"
    ]
  }
};

/**
 * Generates realistic mock reviews with a mix of authentic and fake-sounding text
 */
function generateMockReviews(platform, count = 15) {
  const reviews = [];
  const pool = REVIEW_POOLS[platform] || REVIEW_POOLS.amazon;

  for (let i = 0; i < count; i++) {
    const isFake = Math.random() < 0.3;
    const textPool = isFake ? pool.fake : pool.genuine;
    const text = textPool[Math.floor(Math.random() * textPool.length)];
    const rating = isFake ? 5 : Math.floor(Math.random() * 3) + 3;

    reviews.push({
      text,
      rating,
      verifiedPurchase: Math.random() > 0.2,
      reviewerTotalReviews: isFake ? 'unknown' : Math.floor(Math.random() * 20).toString(),
      date: new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0]
    });
  }

  return reviews;
}

/**
 * Provides realistic mock product details when the API fails.
 */
function getMockProductDetails(platform, productId) {
  logger.info('mock', 'Generating mock data for ' + platform + ' product ' + productId);
  
  const catalog = PRODUCT_CATALOG[platform] || PRODUCT_CATALOG.amazon;

  return {
    title: catalog.title,
    image: catalog.image,
    rating: catalog.rating,
    reviewCount: catalog.reviewCount,
    currentPrice: catalog.currentPrice,
    url: platform === 'amazon' ? 'https://www.amazon.in/dp/' + productId 
       : platform === 'flipkart' ? 'https://www.flipkart.com/p/' + productId
       : 'https://www.meesho.com/p/' + productId,
    reviews: generateMockReviews(platform, 15)
  };
}

/**
 * Provides mock price data for cross-platform comparison.
 * Uses the actual productTitle to keep consistency across platforms.
 */
function getMockPrice(platform, sourcePrice, productTitle) {
  const variance = sourcePrice * 0.15;
  const mockPrice = Math.round(sourcePrice + (Math.random() * variance * 2 - variance));
  
  let title = productTitle || '';
  if (!title) {
    title = platform === 'amazon' ? 'Amazon Product'
         : platform === 'flipkart' ? 'Flipkart Product'
         : 'Meesho Product';
  } else {
    if (title.length > 80) {
      title = title.slice(0, 80) + '...';
    }
  }

  const query = encodeURIComponent(title.replace(/\(.*?\)/g, '').trim());
  const domain = platform === 'amazon' ? '.in' : '.com';
  
  return {
    platform,
    price: mockPrice,
    mrp: Math.round(mockPrice * 1.2),
    title: title,
    url: `https://www.${platform}${domain}/search?q=${query}`,
    available: true
  };
}

/**
 * Classifies the search query/title and returns context-appropriate mock AI reviews analysis.
 */
function getMockAnalysis(productTitle = '') {
  const title = productTitle.toLowerCase();
  
  if (title.includes('laptop') || title.includes('vivobook') || title.includes('asus') || title.includes('computer') || title.includes('ssd') || title.includes('intel') || title.includes('core') || title.includes('macbook')) {
    // Laptop-specific mock analysis
    return {
      trustScore: 7.2,
      reviewsAnalyzed: 45,
      genuinePercent: 78,
      suspiciousPercent: 15,
      incentivizedPercent: 7,
      redFlags: [
        "Multiple review accounts created on the same day posting positive ratings",
        "Unusually high mention of official marketing slogans in 5-star reviews",
      ],
      genuineComplaints: [
        "Battery life is shorter than advertised (approx 4-5 hours under load)",
        "Fan noise becomes loud during heavy software usage",
        "Screen color accuracy is average, not ideal for professional design work",
      ],
      genuinePositives: [
        "High performance with the SSD boot time and multitasking speed",
        "Lightweight and portable thin-and-light chassis",
        "Comfortable keyboard and precise touchpad feedback",
      ],
      productSummary: {
        overview: "The laptop offers reliable performance for multitasking, office work, and casual use, backed by fast boot times. However, battery backup and color accuracy are common drawbacks noted by long-term users.",
        buildQuality: "Average",
        valueForMoney: "Excellent",
        performance: "Excellent",
        targetAudience: "Students, programmers, and office professionals"
      },
      sellerIntel: {
        riskLevel: "Safe",
        redFlags: []
      },
      alternatives: [
        { name: "HP 15s", reason: "Slightly better battery life and integrated graphics performance." },
        { name: "Lenovo IdeaPad Slim 3", reason: "Equipped with a physical camera shutter and robust hinge design." }
      ],
      verdict: "BUY. A strong mid-range contender that delivers great performance for the price, though you should keep a charger handy."
    };
  } else if (title.includes('dress') || title.includes('maxi') || title.includes('printed') || title.includes('fabric') || title.includes('rayon') || title.includes('women') || title.includes('clothing') || title.includes('wear') || title.includes('sari') || title.includes('kurti')) {
    // Dress/Clothing-specific mock analysis
    return {
      trustScore: 5.9,
      reviewsAnalyzed: 32,
      genuinePercent: 55,
      suspiciousPercent: 30,
      incentivizedPercent: 15,
      redFlags: [
        "Highly repetitive praise like 'beautiful dress' with no size details",
        "Several reviews posted in a short 24-hour burst window",
      ],
      genuineComplaints: [
        "Material is thinner than expected and slightly transparent in bright light",
        "Stitching details near the seams and collar are uneven in places",
        "Size chart is inaccurate, fits smaller than expected",
      ],
      genuinePositives: [
        "Attractive floral prints and color match the product photo exactly",
        "Comfortable, breathable rayon material suitable for warm weather",
        "Good value for casual wear at this budget pricing",
      ],
      productSummary: {
        overview: "An attractive casual dress option that matches the pictures visually. The fabric is light and breathable, though quality control on stitching and size accuracy could be improved.",
        buildQuality: "Poor",
        valueForMoney: "Average",
        performance: "Average",
        targetAudience: "Casual day wear and budget fashion shoppers"
      },
      sellerIntel: {
        riskLevel: "Caution",
        redFlags: ["Multiple returns registered for size fitting issues"]
      },
      alternatives: [
        { name: "A-Line Georgette Midi Dress", reason: "Features lining fabric and reinforced double stitching." },
        { name: "Cotton Blend Flared Kurta", reason: "Standard regional sizing accuracy and pre-shrunk cotton fabric." }
      ],
      verdict: "WAIT. Consider ordering one size larger than your usual to account for fitting issues, and inspect the seams on arrival."
    };
  } else if (title.includes('headphone') || title.includes('earphone') || title.includes('boat') || title.includes('rockerz') || title.includes('bluetooth') || title.includes('audio') || title.includes('sound') || title.includes('speaker') || title.includes('buds')) {
    // Audio/Headphone-specific mock analysis (Original boAt default)
    return {
      trustScore: 6.8,
      reviewsAnalyzed: 120,
      genuinePercent: 62,
      suspiciousPercent: 28,
      incentivizedPercent: 10,
      redFlags: [
        "Multiple 5-star reviews use identical phrases like 'best headphone ever' and 'must buy'",
        "23% of reviewers have no other purchase history on the platform",
        "Burst of 40+ five-star reviews posted within a 3-day window in March 2026"
      ],
      genuineComplaints: [
        "Ear cushions overheat after 1-2 hours of continuous use",
        "Mic quality on calls is muffled — callers report difficulty hearing",
        "Left ear cup develops rattle at high volume after 5-6 months",
        "Volume buttons feel loose and sometimes unresponsive"
      ],
      genuinePositives: [
        "Bass response is excellent for the price range (outperforms JBL Tune 510BT)",
        "Battery consistently delivers 12-15 hours on a single charge",
        "Foldable design and lightweight build make it great for commuting",
        "Bluetooth range holds strong up to 8-10 meters"
      ],
      productSummary: {
        overview: "The audio device delivers impressive bass performance and reliable battery life at a competitive price point. Genuine reviewers consistently praise the sound-to-price ratio and the comfortable fit. However, several long-term users report durability concerns with daily use.",
        buildQuality: "Average",
        valueForMoney: "Excellent",
        performance: "Average",
        targetAudience: "Budget-conscious bass lovers and daily commuters"
      },
      sellerIntel: {
        riskLevel: "Safe",
        redFlags: ["Some third-party sellers ship refurbished units as new", "Check for authorized seller for genuine stock"]
      },
      alternatives: [
        { name: "JBL Tune 510BT", reason: "Clearer vocals and better mic quality for calls at a similar price point." },
        { name: "Sony WH-CH520", reason: "Superior 50-hour battery life and lighter weight, though slightly less bass." }
      ],
      verdict: "BUY with caution. The device is a solid value pick for bass-heavy listeners under Rs 1500. However, 28% of reviews appear suspicious. Verify you are buying from an authorized seller."
    };
  } else {
    // Generic dynamic mock analysis
    const cleanTitle = productTitle ? (productTitle.length > 50 ? productTitle.slice(0, 50) + '...' : productTitle) : 'this product';
    return {
      trustScore: 6.8,
      reviewsAnalyzed: 25,
      genuinePercent: 65,
      suspiciousPercent: 25,
      incentivizedPercent: 10,
      redFlags: [
        `Repeated generic positive phrases about "${cleanTitle}"`,
        "Accounts review-burst behavior patterns detected",
      ],
      genuineComplaints: [
        "Long-term durability concerns reported by users after 3 months",
        "Standard packaging and delivery accessories could be improved",
      ],
      genuinePositives: [
        "Performs well relative to its price bracket",
        "Meets the primary functional expectations described by the seller",
      ],
      productSummary: {
        overview: `A decent option for "${cleanTitle}". Most real buyers report satisfying performance, but note standard durability limitations over extended use.`,
        buildQuality: "Average",
        valueForMoney: "Average",
        performance: "Average",
        targetAudience: "Budget-conscious shoppers looking for reliable performance"
      },
      sellerIntel: {
        riskLevel: "Safe",
        redFlags: []
      },
      alternatives: [
        { name: "Generic Premium Brand", reason: "Higher build quality and extended warranty support." },
        { name: "Generic Entry Model", reason: "Lower price point while maintaining similar core utility." }
      ],
      verdict: `BUY with caution. A reasonable purchase choice for "${cleanTitle}", but check the return policy and seller ratings.`
    };
  }
}

module.exports = { getMockProductDetails, getMockPrice, generateMockReviews, getMockAnalysis };
