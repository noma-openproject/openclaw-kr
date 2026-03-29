const { test, expect } = require('@playwright/test');

test.describe('OpenClaw Launcher Smoke Tests', () => {
  test('dashboard loads with HTTP 200', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    expect(response, 'Expected a response from the dashboard').not.toBeNull();
    expect(response.status(), `Expected HTTP 200 but got ${response.status()}`).toBe(200);
  });

  test('page has content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Verify the page has a non-empty body
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length, 'Expected page body to have content').toBeGreaterThan(0);

    // Also verify the page has a title (even if empty string, it should exist as an element)
    const title = await page.title();
    // Title check is informational — log it but do not fail if empty
    console.log(`Page title: "${title}"`);
  });

  test('no JavaScript console errors on page load', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`[pageerror] ${err.message}`);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Allow a short settle time for any deferred scripts to run
    await page.waitForTimeout(1000);

    expect(
      consoleErrors,
      `Unexpected console errors:\n${consoleErrors.join('\n')}`
    ).toHaveLength(0);
  });
});
