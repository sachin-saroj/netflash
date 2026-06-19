import { test, expect } from '@playwright/test';

test.describe('NETflash End-to-End Watchlist Journey', () => {
  test('should register, login, analyze, and save to watchlist', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));
    page.on('request', request => console.log('REQUEST SENT:', request.method(), request.url()));
    page.on('response', response => console.log('RESPONSE RECV:', response.status(), response.url()));
    page.on('requestfailed', request => console.error('REQUEST FAILED:', request.url(), request.failure()?.errorText));

    const testEmail = `user_${Date.now()}@example.com`;

    // 1. Load the Homepage
    await page.goto('/');
    // Check main branding title is present
    await expect(page.locator('h1')).toContainText("Don't trust the reviews");
    await expect(page.locator('nav')).toContainText('NETflash');

    // 2. Open Auth Modal via the Navbar Save Button (or Login)
    const loginNavBtn = page.locator('nav').getByText('Log In');
    await loginNavBtn.click();

    // 3. Switch modal to Register/Sign Up mode
    await page.getByText('Sign Up').click();
    await expect(page.locator('h2')).toHaveText('Create Account');

    // 4. Fill registration details and submit
    await page.locator('#name-input').fill('Playwright Test User');
    await page.locator('#email-input').fill(testEmail);
    await page.locator('#password-input').fill('password123');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // 5. Verify registration logged us in (Navbar should display Logout and Watchlist)
    await expect(page.locator('nav')).toContainText('Watchlist');
    await expect(page.locator('nav')).toContainText('Logout');

    // 6. Navigate back to Home and search for a supported product
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="Paste Amazon, Flipkart, or Meesho"]');
    await searchInput.fill('https://www.amazon.in/dp/B07WHSY9JQ');
    await page.getByRole('button', { name: /Analyze/i }).click();

    // 7. Verify we land on the Results page and render analysis details
    await expect(page).toHaveURL(/\/results/);
    await expect(page.locator('.product-title')).toBeVisible();

    // 8. Save product to Watchlist
    const saveBtn = page.getByRole('button', { name: /Save/i });
    await saveBtn.click();

    // 9. Verify button updates to "Saved"
    await expect(saveBtn).toContainText('Saved', { timeout: 15000 });

    // 10. Click Dashboard link and verify saved watchlist item is visible
    await page.locator('nav').getByText('Watchlist').click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.dashboard-page')).toContainText('boAt Rockerz 450');

    // 11. Delete product from Watchlist
    const deleteBtn = page.locator('.watchlist-card').getByText('Delete');
    await deleteBtn.click();

    // 12. Verify item is removed
    await expect(page.locator('.dashboard-page')).not.toContainText('boAt Rockerz 450');
  });
});
