// Page Metrics Collection Script (Playwright)
// Usage: node page-metrics.js <url>
// Requires: npx playwright install chromium
//
// Collects: TTFB, FCP, LCP, CLS, DOM count, resource breakdown
// LCP/CLS use PerformanceObserver set up BEFORE navigation for accurate capture.

const { chromium } = require('playwright');

async function collectMetrics(url, options = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Inject PerformanceObservers BEFORE navigation to capture LCP and CLS
  await page.addInitScript(() => {
    window.__perfMetrics = { lcp: 0, cls: 0, lcpElement: '', clsShifts: [] };

    // LCP observer — captures largest contentful paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      window.__perfMetrics.lcp = last.startTime;
      window.__perfMetrics.lcpElement = last.element?.tagName || 'unknown';
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // CLS observer — accumulates layout shift scores
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__perfMetrics.cls += entry.value;
          window.__perfMetrics.clsShifts.push({
            value: entry.value,
            sources: entry.sources?.map(s => s.node?.tagName || 'unknown') || []
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait a bit for late layout shifts and LCP to settle
  await page.waitForTimeout(2000);

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(e => e.name === 'first-contentful-paint');
    const resources = performance.getEntriesByType('resource');

    return {
      // Core Web Vitals
      ttfb: nav ? nav.responseStart - nav.requestStart : null,
      fcp: fcp?.startTime || null,
      lcp: window.__perfMetrics.lcp || null,
      lcpElement: window.__perfMetrics.lcpElement || null,
      cls: window.__perfMetrics.cls || 0,
      clsShifts: window.__perfMetrics.clsShifts || [],

      // DOM metrics
      domCount: document.querySelectorAll('*').length,
      scriptCount: document.querySelectorAll('script').length,
      styleSheetCount: document.styleSheets.length,

      // Resource breakdown
      resourceCount: resources.length,
      transferSize: resources.reduce((s, r) => s + (r.transferSize || 0), 0),
      jsBytes: resources.filter(r => r.initiatorType === 'script').reduce((s, r) => s + (r.transferSize || 0), 0),
      cssBytes: resources.filter(r => r.initiatorType === 'link' || r.initiatorType === 'style').reduce((s, r) => s + (r.transferSize || 0), 0),
      imageBytes: resources.filter(r => r.initiatorType === 'img').reduce((s, r) => s + (r.transferSize || 0), 0),
      fontBytes: resources.filter(r => r.name.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)).reduce((s, r) => s + (r.transferSize || 0), 0),

      // Third-party scripts
      thirdPartyScripts: resources
        .filter(r => r.initiatorType === 'script' && !r.name.includes(location.host))
        .map(r => ({ url: r.name, size: r.transferSize || 0, duration: r.duration || 0 })),

      // Image details (for optimization check)
      images: Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src?.substring(0, 100),
        loading: img.loading || 'eager',
        width: img.naturalWidth,
        height: img.naturalHeight,
        hasExplicitDimensions: img.hasAttribute('width') && img.hasAttribute('height'),
        decodingAttr: img.decoding || 'auto',
      })),

      // Font loading
      fonts: Array.from(document.fonts).map(f => ({
        family: f.family,
        status: f.status,
        display: f.display || 'unknown',
      })),
    };
  });

  await browser.close();
  return metrics;
}

module.exports = { collectMetrics };
