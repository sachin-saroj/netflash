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
 * Provides mock price data for cross-platform comparison
 */
function getMockPrice(platform, sourcePrice, productTitle = '') {
  const basePrice = sourcePrice || (Math.floor(Math.random() * 500) + 500);
  const variance = basePrice * 0.05; // 5% variance for more realistic price comparison
  const mockPrice = Math.round(basePrice + (Math.random() * variance * 2 - variance));
  
  let title = productTitle;
  if (!title) {
    title = platform === 'amazon' ? 'boAt Rockerz 450 Bluetooth Headphones'
         : platform === 'flipkart' ? 'boAt Rockerz 450 On-Ear Headphone'
         : 'boAt Rockerz 450 Wireless Headset';
  }

  const queryWords = title.split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
  const query = encodeURIComponent(queryWords);
  const url = platform === 'amazon'
    ? `https://www.amazon.in/s?k=${query}`
    : platform === 'flipkart'
    ? `https://www.flipkart.com/search?q=${query}`
    : `https://www.meesho.com/search?q=${query}`;

  return {
    platform,
    price: mockPrice,
    mrp: Math.round(mockPrice * 1.15),
    title: title,
    url: url,
    available: true
  };
}

module.exports = { getMockProductDetails, getMockPrice, generateMockReviews };
