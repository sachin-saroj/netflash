const { scrapeProductDetails, scrapeSearchPrice } = require('../services/puppeteerScraper');
const logger = require('../utils/logger');

async function runVerification() {
  logger.info('test', 'Starting verification test for real e-commerce data aggregator');

  // Test 1: Flipkart Product Detail Scraping
  const fkUrl = 'https://www.flipkart.com/campus-mike-n-running-shoes-men/p/itm27c989f1e20c6?pid=SHOG4G3XXA5GHCY7';
  logger.info('test', `Running Test 1: Scrape Flipkart details from URL: ${fkUrl}`);
  try {
    const details = await scrapeProductDetails('flipkart', 'SHOG4G3XXA5GHCY7', fkUrl);
    console.log('\n[Flipkart Detail Scrape Results]:');
    console.log(`Title: "${details.title}"`);
    console.log(`Price: ₹${details.currentPrice}`);
    console.log(`MRP: ₹${details.mrp}`);
    console.log(`Image: ${details.image}`);
    console.log(`Rating: ${details.rating}`);
    console.log(`Review Count: ${details.reviewCount}`);
    console.log(`Reviews Extracted: ${details.reviews ? details.reviews.length : 0}`);
    if (details.reviews) {
      console.log('Sample Review 1:', details.reviews[0].text);
    }
    
    if (details.currentPrice <= 0 || !details.title) {
      throw new Error('Test 1 failed: Price or Title is empty.');
    }
    logger.info('test', 'Test 1 successful.');
  } catch (err) {
    logger.error('test', `Test 1 failed: ${err.message}`);
  }

  // Test 2: Flipkart Search Price Scraping
  const query = 'Campus Mike N Running Shoes';
  logger.info('test', `Running Test 2: Search Flipkart for query: "${query}"`);
  try {
    const searchRes = await scrapeSearchPrice('flipkart', query);
    console.log('\n[Flipkart Search Results]:');
    if (searchRes) {
      console.log(`Title: "${searchRes.title}"`);
      console.log(`Price: ₹${searchRes.price}`);
      console.log(`URL: ${searchRes.url}`);
      console.log(`Image: ${searchRes.image}`);
      if (searchRes.price <= 0) {
        throw new Error('Test 2 failed: Scraped search price is invalid.');
      }
    } else {
      throw new Error('Test 2 failed: No search results returned.');
    }
    logger.info('test', 'Test 2 successful.');
  } catch (err) {
    logger.error('test', `Test 2 failed: ${err.message}`);
  }

  // Test 3: Meesho Search Price Scraping
  logger.info('test', `Running Test 3: Search Meesho for query: "${query}"`);
  try {
    const searchRes = await scrapeSearchPrice('meesho', query);
    console.log('\n[Meesho Search Results]:');
    if (searchRes) {
      console.log(`Title: "${searchRes.title}"`);
      console.log(`Price: ₹${searchRes.price}`);
      console.log(`URL: ${searchRes.url}`);
      console.log(`Image: ${searchRes.image}`);
    } else {
      console.log('Meesho search returned null (likely Akamai block or no results)');
    }
    logger.info('test', 'Test 3 complete.');
  } catch (err) {
    logger.error('test', `Test 3 failed: ${err.message}`);
  }

  console.log('\nVerification run finished.');
}

runVerification();
