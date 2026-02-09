---
name: perf-audit
description: Run a comprehensive performance audit on a web application (Next.js, React, Angular, Vue, .NET). Use when asked to "test speed", "check performance", "run lighthouse", "audit performance", or "speed test". Measures FCP, LCP, CLS, TTFB, bundle size, and Lighthouse scores across all pages.
argument-hint: [target]
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob, WebFetch, Task
---

# Performance Audit Skill

Run a comprehensive performance audit on the current web application.
Target: $ARGUMENTS (defaults to "full" if not specified).

## Targets

- `full` (default) — All pages, interactions, Lighthouse, and bundle analysis
- `pages` — Page load metrics only (public + authenticated)
- `lighthouse` — Lighthouse detailed audit
- `interactions` — UI interaction timing
- `bundle` — Bundle size analysis only
- `vitals` — Core Web Vitals summary

## Prerequisites

1. Playwright must be installed (`npx playwright install chromium`)
2. For authenticated pages, test credentials in `.env.local`:
   ```
   TEST_USER_EMAIL=<email>
   TEST_USER_PASSWORD=<password>
   ```

If missing, tell the user to set them up before running the audit.

## Workflow

### 0. Auto-Detect Framework

Before anything else, detect what framework the project uses. Check in order:

| Priority | Detection signal | Framework |
|----------|-----------------|-----------|
| 1 | `next.config.*` exists in project root | **Next.js** |
| 2 | `angular.json` exists in project root | **Angular** |
| 3 | `vite.config.*` exists AND `vue` in `package.json` dependencies | **Vue (Vite)** |
| 4 | `vue.config.*` exists OR `@vue/cli-service` in `package.json` dependencies | **Vue (CLI)** |
| 5 | `vite.config.*` exists AND `react` in `package.json` dependencies | **React (Vite)** |
| 6 | `react-scripts` in `package.json` dependencies | **React (CRA)** |
| 7 | `*.csproj` or `*.sln` files exist in project root | **.NET** |
| 8 | None of the above | **Ask user** for framework and base URL |

Use `Glob` to check for these files. Once detected, announce the framework to the user and proceed.

### 1. Discover Application Routes

Scan the project to discover all routes. The approach depends on the detected framework:

**Next.js:**
- Read the `app/` directory structure — look for `page.tsx` or `page.js` files
- If `app/` doesn't exist, check `pages/` directory for `index.tsx`, `[slug].tsx`, etc.
- Identify public vs. authenticated routes (check for auth middleware, layout auth checks)
- Identify detail/dynamic routes (e.g., `/projects/[id]`)

**Angular:**
- Look for routing modules — check `app-routing.module.ts`, `app.routes.ts`, or files with `RouterModule.forRoot()` / `provideRouter()` calls
- Parse route definitions: `{ path: '...', component: ... }` objects in `Routes` arrays
- Check for `loadChildren` / `loadComponent` for lazy-loaded routes
- Look for `canActivate` / `canMatch` guards to distinguish public vs. authenticated routes

**Vue (Vite / CLI):**
- Search `src/` for `vue-router` configuration — check `src/router/index.ts`, `src/router.ts`, or files importing `createRouter`
- Parse route definitions: `{ path: '...', component: ... }` objects passed to `createRouter()`
- Check for `meta.requiresAuth` or navigation guards (`beforeEach`) to distinguish public vs. authenticated routes
- Look for `children` arrays for nested routes

**React (Vite / CRA):**
- Search `src/` for router configuration — look for `react-router-dom` imports
- Parse route definitions in files like `App.tsx`, `router.tsx`, `routes.tsx`, or `main.tsx`
- Look for `<Route path="..." />`, `createBrowserRouter`, or `createRoutesFromElements` calls
- Extract path strings from route definitions
- Check for auth guards / protected route wrappers to distinguish public vs. authenticated routes

**.NET:**
- Check if the project uses Razor Pages (`Pages/` directory with `.cshtml` files)
- Check if it uses MVC (`Controllers/` directory with `*Controller.cs` files)
- Check `Program.cs` for minimal API endpoints (`MapGet`, `MapPost`, `MapControllerRoute`)
- For Razor Pages: each `.cshtml` file = a route (e.g., `Pages/Index.cshtml` → `/`)
- For MVC: parse controller actions and `[Route]` / `[HttpGet]` attributes
- For minimal APIs: parse `MapGet`/`MapPost` calls in `Program.cs`

**For all frameworks:** Group routes into: public pages, authenticated pages, detail pages. Check for sidebar or navigation components to find all user-facing pages.

### 2. Start Dev Server

Start the dev server if one isn't already running. The command depends on the framework:

| Framework | Start command | Default port | Health check URL |
|-----------|-------------|-------------|-----------------|
| Next.js | `npm run dev` or `pnpm dev` | 3000 | `http://localhost:3000` |
| Angular | `ng serve` or `npm start` | 4200 | `http://localhost:4200` |
| Vue (Vite) | `npm run dev` or `pnpm dev` | 5173 | `http://localhost:5173` |
| Vue (CLI) | `npm run serve` | 8080 | `http://localhost:8080` |
| React (Vite) | `npm run dev` or `pnpm dev` | 5173 | `http://localhost:5173` |
| React (CRA) | `npm start` or `pnpm start` | 3000 | `http://localhost:3000` |
| .NET | `dotnet run` | 5000 (http) / 5001 (https) | `http://localhost:5000` |

Check if the port is already in use before starting. If the server is already running, use the existing one.

### 3. Page Load Audit (Playwright)

For each discovered route, use Playwright to measure performance metrics.

Create a temporary script or run inline:

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// For authenticated routes, log in first
// Find the login page and fill credentials from env vars

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
```

For **authenticated routes**:
1. Navigate to the login page
2. Fill in `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` from environment
3. Submit the form and wait for redirect
4. Then navigate to each authenticated route using the same browser context

### 4. Lighthouse Audit

Run Lighthouse CLI on each page:

```bash
npx lighthouse <url> --output=json --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo
```

For authenticated pages, extract cookies from the Playwright session and pass via `--extra-headers`:

```bash
npx lighthouse <url> --output=json --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --extra-headers='{"Cookie": "<session-cookies>"}' \
  --only-categories=performance,accessibility,best-practices,seo
```

Parse the JSON output to extract category scores.

Note: Lighthouse may exit with code 1 on Windows due to Chrome temp dir cleanup — this is harmless. Check that the JSON report was written successfully.

If any authenticated page shows redirect to login, the auth cookies may have expired. Re-authenticate and retry.

### 5. Bundle Size Analysis

Run the framework-specific build command and analyze the output:

| Framework | Build command | Output directory | Chunk files |
|-----------|-------------|-----------------|-------------|
| Next.js | `npx next build` | `.next/static/chunks/` | `*.js` |
| Angular | `ng build` | `dist/<project-name>/browser/` | `*.js` |
| Vue (Vite) | `npm run build` | `dist/assets/` | `*.js`, `*.css` |
| Vue (CLI) | `npm run build` | `dist/js/` | `*.js` |
| React (Vite) | `npm run build` | `dist/assets/` | `*.js`, `*.css` |
| React (CRA) | `npm run build` | `build/static/js/` | `*.js` |
| .NET | `dotnet publish -c Release` | `bin/Release/net*/publish/wwwroot/` | JS/CSS in `_framework/` or bundled assets |

Then list the top JS chunks by size from the output directory:

```bash
node -e "
const fs = require('fs');
const path = require('path');
function walk(dir) {
  let r = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) r = r.concat(walk(full));
    else if (item.endsWith('.js')) r.push({ name: item, size: stat.size });
  }
  return r;
}
const files = walk('<OUTPUT_DIR>').sort((a,b) => b.size - a.size);
let total = 0;
files.forEach(f => total += f.size);
console.log('Top 10 chunks:');
files.slice(0,10).forEach(f => console.log('  ' + (f.size/1024).toFixed(0) + ' kB  ' + f.name));
console.log('Total: ' + (total/1024).toFixed(0) + ' kB (' + files.length + ' chunks)');
"
```

Replace `<OUTPUT_DIR>` with the correct path for the detected framework.

For **Next.js** with bundle analyzer, optionally run with `ANALYZE=true`:
```bash
ANALYZE=true npx next build
```

### 6. Core Web Vitals

Check for `@vercel/speed-insights` or `web-vitals` in `package.json` dependencies.

If the app is deployed, remind the user to check real-user metrics in their hosting provider's dashboard (Vercel Speed Insights, Google Search Console, etc.).

### 7. Interaction Timing (if target is `full` or `interactions`)

Test common UI interactions:

- **Command palette / search**: Measure time from keyboard shortcut (Cmd+K / Ctrl+K) to visible
- **Modal / dialog opening**: Measure time from click to fully rendered
- **Navigation transitions**: Measure sidebar link click to new page content visible
- **Form submissions**: Measure submit to response

Use Playwright's timing APIs:
```javascript
const start = Date.now();
await page.keyboard.press('Control+k');
await page.waitForSelector('[data-command-palette]', { state: 'visible' });
const duration = Date.now() - start;
```

Note: The specific selectors and interactions depend on the application. Adapt the interaction tests based on what the route discovery reveals about the app's UI.

### 8. Comparison with Previous Run

If a previous results file exists (e.g., `perf-audit-results.json`), load it and compare:

- Flag regressions (metrics that got worse by >10%)
- Highlight improvements
- Show delta for each metric

Save current results for future comparison.

## Summary Report

Present a comprehensive summary covering:

1. **Framework Detected** — Which framework was identified and how
2. **Page Metrics Table** — All pages with FCP, LCP, CLS, TTFB, DOM count, transfer size
3. **Lighthouse Scores** — Performance, Accessibility, Best Practices, SEO per page
4. **Bundle Sizes** — Total JS, top 10 chunks
5. **Interaction Timing** — Command palette, modals, navigation transitions
6. **Threshold Checks** — Flag any page exceeding:
   - LCP > 2.5s
   - FCP > 1.8s
   - CLS > 0.1
   - TTFB > 800ms
7. **Regressions** — Compare with previous run if available
8. **Recommendations** — Suggest specific fixes for any failing metrics
