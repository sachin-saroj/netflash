/* global window */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// F-14: Relocated screen capture script. Updated path to point correctly to root screenshots directory.
const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)){
    fs.mkdirSync(SCREENSHOT_DIR);
}

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
      headless: "new",
      defaultViewport: { width: 1440, height: 900 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // ====== 1. HOME PAGE ======
  console.log('[1/5] Capturing Home Page...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_home.png') });
  console.log('  -> Saved 01_home.png');

  // ====== 2. NAVIGATE TO RESULTS (boAt Rockerz 450) ======
  console.log('[2/5] Triggering product analysis...');
  await page.goto('http://localhost:5173/results?url=https://www.amazon.in/dp/B08L5VM2B3', { 
     waitUntil: 'domcontentloaded', 
     timeout: 60000 
  });
  
  // Wait for the analysis to complete — the .product-title appears when results render
  console.log('  -> Waiting for AI analysis to finish (up to 45s)...');
  try {
    await page.waitForSelector('.product-title', { timeout: 45000 });
    // Extra wait for charts/animations to fully render
    await new Promise(r => setTimeout(r, 3000));
    console.log('  -> Analysis complete!');
  } catch (e) {
    console.log('  -> Timeout! Checking page state...');
    const pageContent = await page.content();
    if (pageContent.includes('Analysis Failed')) {
      console.log('  -> ERROR: Analysis endpoint returned failure.');
    }
    // Still take screenshots of whatever is showing
  }

  // ====== 3. TOP SECTION (Product + Trust Score + Radar) ======
  console.log('[3/5] Capturing Dashboard Top...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_dashboard_top.png') });
  console.log('  -> Saved 02_dashboard_top.png');

  // ====== 4. MIDDLE SECTION (Price Chart + Seller Trust) ======
  console.log('[4/5] Capturing Dashboard Middle...');
  await page.evaluate(() => window.scrollBy(0, 650));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_dashboard_middle.png') });
  console.log('  -> Saved 03_dashboard_middle.png');

  // ====== 5. BOTTOM SECTION (Summary + Alternatives) ======
  console.log('[5/5] Capturing Dashboard Bottom...');
  await page.evaluate(() => window.scrollBy(0, 700));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_dashboard_bottom.png') });
  console.log('  -> Saved 04_dashboard_bottom.png');

  // ====== BONUS: FULL PAGE ======
  console.log('[BONUS] Capturing Full Page...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_full_page.png'), fullPage: true });
  console.log('  -> Saved 05_full_page.png');

  await browser.close();
  console.log('\nAll 5 screenshots captured successfully!');
  console.log('Location: ' + SCREENSHOT_DIR);
})();
