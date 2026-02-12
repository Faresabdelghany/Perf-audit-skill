// Page Metrics Collection Script (Playwright)
// Usage: node page-metrics.js <url> [--auth]
// Requires: npx playwright install chromium

const { chromium } = require('playwright');

async function collectMetrics(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url, { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(e => e.name === 'first-contentful-paint');
    const lcp = new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        resolve(entries[entries.length - 1].startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const resources = performance.getEntriesByType('resource');

    return {
      ttfb: nav.responseStart - nav.requestStart,
      fcp: fcp?.startTime,
      domCount: document.querySelectorAll('*').length,
      resourceCount: resources.length,
      transferSize: resources.reduce((s, r) => s + (r.transferSize || 0), 0),
      jsBytes: resources.filter(r => r.initiatorType === 'script').reduce((s, r) => s + (r.transferSize || 0), 0),
      cssBytes: resources.filter(r => r.initiatorType === 'link' || r.initiatorType === 'style').reduce((s, r) => s + (r.transferSize || 0), 0),
      imageBytes: resources.filter(r => r.initiatorType === 'img').reduce((s, r) => s + (r.transferSize || 0), 0),
    };
  });

  await browser.close();
  return metrics;
}

// For authenticated routes:
// 1. Navigate to login page
// 2. Fill TEST_USER_EMAIL and TEST_USER_PASSWORD from process.env
// 3. Submit and wait for redirect
// 4. Navigate to each authenticated route using same browser context

module.exports = { collectMetrics };
