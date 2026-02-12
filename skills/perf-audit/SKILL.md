---
name: perf-audit
description: Use when asked to "test speed", "check performance", "run lighthouse", "audit performance", "speed test", or diagnose slow page loads, high LCP, layout shifts, or large bundles. Supports Next.js, React, Angular, Vue, and .NET projects.
argument-hint: [target]
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob, WebFetch, Task
---

# Performance Audit Skill

Run a comprehensive performance audit on the current web application.
Target: $ARGUMENTS (defaults to "full" if not specified).

## When to Use

- User asks to "check performance", "run lighthouse", "audit speed", "test speed"
- Page loads feel slow — high FCP, LCP, or TTFB
- Layout shifts or CLS issues reported
- Bundle size concerns or JS bloat
- Before a production deploy to catch regressions
- Comparing performance after optimization changes

## When NOT to Use

- API-only backends with no frontend (use load testing tools instead)
- Static sites with no JS (Lighthouse alone suffices)
- Mobile-native apps (use platform-specific profilers)

## Quick Reference

| Target | What it runs |
|--------|-------------|
| `full` (default) | Pages + interactions + Lighthouse + bundle |
| `pages` | Page load metrics only (FCP, LCP, CLS, TTFB) |
| `lighthouse` | Lighthouse audit only (Perf, A11y, BP, SEO) |
| `interactions` | UI interaction timing only |
| `bundle` | Bundle size analysis only |
| `vitals` | Core Web Vitals summary |

| Metric | Threshold (flags if exceeded) |
|--------|-------------------------------|
| LCP | > 2.5s |
| FCP | > 1.8s |
| CLS | > 0.1 |
| TTFB | > 800ms |

## Prerequisites

1. Playwright installed: `npx playwright install chromium`
2. For authenticated pages, set credentials in `.env.local`:
   ```
   TEST_USER_EMAIL=<email>
   TEST_USER_PASSWORD=<password>
   ```

If missing, tell the user to set them up before running the audit.

## Workflow

### 0. Auto-Detect Framework

Detect the project framework using `Glob`. Check in priority order:

| Priority | Detection signal | Framework |
|----------|-----------------|-----------|
| 1 | `next.config.*` | **Next.js** |
| 2 | `angular.json` | **Angular** |
| 3 | `vite.config.*` + `vue` in deps | **Vue (Vite)** |
| 4 | `vue.config.*` or `@vue/cli-service` in deps | **Vue (CLI)** |
| 5 | `vite.config.*` + `react` in deps | **React (Vite)** |
| 6 | `react-scripts` in deps | **React (CRA)** |
| 7 | `*.csproj` or `*.sln` | **.NET** |
| 8 | None matched | **Ask user** |

Announce the detected framework and proceed.

### 1. Discover Application Routes

Scan the project to discover all routes. Group into: **public**, **authenticated**, and **detail/dynamic** pages.

**Next.js:** Read `app/` for `page.tsx`/`page.js`, or `pages/` directory. Check auth middleware for route classification.

**Angular:** Parse `app-routing.module.ts` or `app.routes.ts`. Check `canActivate`/`canMatch` guards for auth routes.

**Vue:** Find `vue-router` config in `src/router/`. Check `meta.requiresAuth` or `beforeEach` guards.

**React:** Find `react-router-dom` usage in `App.tsx`, `router.tsx`, or `routes.tsx`. Check for protected route wrappers.

**.NET:** Check Razor Pages (`Pages/*.cshtml`), MVC Controllers (`Controllers/*Controller.cs`), or minimal API endpoints in `Program.cs`.

Also check sidebar/navigation components to find all user-facing pages.

### 2. Start Dev Server

Start the dev server if one isn't already running:

| Framework | Start command | Default port |
|-----------|-------------|-------------|
| Next.js | `npm run dev` | 3000 |
| Angular | `ng serve` | 4200 |
| Vue (Vite) | `npm run dev` | 5173 |
| Vue (CLI) | `npm run serve` | 8080 |
| React (Vite) | `npm run dev` | 5173 |
| React (CRA) | `npm start` | 3000 |
| .NET | `dotnet run` | 5000 |

Check if the port is already in use before starting.

### 3. Page Load Audit (Playwright)

For each discovered route, measure performance metrics using Playwright. See `page-metrics.js` in this directory for the collection script.

Metrics collected per page: TTFB, FCP, DOM count, resource count, transfer size, JS/CSS/image bytes.

For authenticated routes: log in first using env credentials, then navigate using the same browser context.

### 4. Lighthouse Audit

Run Lighthouse CLI on each page:

```bash
npx lighthouse <url> --output=json --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo
```

For authenticated pages, extract cookies from the Playwright session and pass via `--extra-headers='{"Cookie": "<session-cookies>"}'`.

Note: Lighthouse may exit with code 1 on Windows due to Chrome temp dir cleanup — this is harmless if the JSON report was written.

### 5. Bundle Size Analysis

Run the framework-specific build and analyze output. See `bundle-analysis.js` in this directory.

| Framework | Build command | Output directory |
|-----------|-------------|-----------------|
| Next.js | `npx next build` | `.next/static/chunks/` |
| Angular | `ng build` | `dist/<project>/browser/` |
| Vue (Vite) | `npm run build` | `dist/assets/` |
| Vue (CLI) | `npm run build` | `dist/js/` |
| React (Vite) | `npm run build` | `dist/assets/` |
| React (CRA) | `npm run build` | `build/static/js/` |
| .NET | `dotnet publish -c Release` | `bin/Release/net*/publish/wwwroot/` |

### 6. Core Web Vitals

Check for `@vercel/speed-insights` or `web-vitals` in `package.json`. If the app is deployed, remind user to check real-user metrics (Vercel Speed Insights, Google Search Console).

### 7. Interaction Timing (if target is `full` or `interactions`)

Test common UI interactions using Playwright timing:

- **Search/command palette**: Keyboard shortcut to visible
- **Modal/dialog**: Click to fully rendered
- **Navigation**: Sidebar click to new content visible
- **Form submit**: Submit to response

Adapt selectors based on what route discovery reveals about the app's UI.

### 8. Comparison with Previous Run

If `perf-audit-results.json` exists, compare metrics:
- Flag regressions (>10% worse)
- Highlight improvements
- Show deltas

Save current results for future comparison.

## Summary Report

Present results covering:

1. **Framework Detected** and how
2. **Page Metrics Table** — FCP, LCP, CLS, TTFB, DOM count, transfer size per page
3. **Lighthouse Scores** — Performance, Accessibility, Best Practices, SEO
4. **Bundle Sizes** — Total JS, top 10 chunks
5. **Interaction Timing** — If measured
6. **Threshold Violations** — Any metric exceeding thresholds above
7. **Regressions** — Delta from previous run if available
8. **Recommendations** — Specific fixes for failing metrics

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Running audit without dev server | Start the server first or check if port is in use |
| Lighthouse on authenticated page without cookies | Extract cookies from Playwright session and pass via `--extra-headers` |
| Measuring metrics on first cold load only | Run 2-3 times and average for reliable results |
| Ignoring CLS because score looks low | CLS accumulates — check individual elements with `layout-shift` entries |
| Not saving results for regression tracking | Always write `perf-audit-results.json` for future comparison |
| Bundle analysis on dev build | Always run the production build command, not dev |
