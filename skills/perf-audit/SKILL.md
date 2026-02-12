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
| `full` (default) | Pages + interactions + Lighthouse + bundle + image/font/3P checks |
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

Playwright must be installed. If not found, offer to install it automatically:

```bash
npx playwright install chromium
```

No other manual setup required — authentication is handled interactively (see Step 2).

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

Also detect the **rendering strategy** per route:

| Strategy | How to detect | Perf implications |
|----------|--------------|-------------------|
| **SSR** | `getServerSideProps`, `"use server"`, server components | TTFB is critical, hydration cost matters |
| **SSG** | `getStaticProps`, `generateStaticParams`, static exports | Fast TTFB, watch for stale data revalidation |
| **CSR** | Client-only components, no server data fetching | Large JS bundles, slow FCP/LCP |
| **ISR** | `revalidate` in static props | Similar to SSG but check revalidation timing |

Announce the detected framework and rendering strategy, then proceed.

### 1. Discover Routes and Detect Auth Requirements

Scan the project to discover all routes. For each route, determine if it requires authentication by **reading the codebase**.

**Route Discovery (per framework):**

**Next.js:** Read `app/` for `page.tsx`/`page.js`, or `pages/` directory.
**Angular:** Parse `app-routing.module.ts` or `app.routes.ts`.
**Vue:** Find `vue-router` config in `src/router/`.
**React:** Find `react-router-dom` usage in `App.tsx`, `router.tsx`, or `routes.tsx`.
**.NET:** Check Razor Pages, MVC Controllers, or minimal API endpoints in `Program.cs`.

Also check sidebar/navigation components to find all user-facing pages.

**Auth Detection — Read the codebase to classify routes:**

| What to look for | Framework | Means route is protected |
|-----------------|-----------|------------------------|
| `middleware.ts` with path matchers | Next.js | Routes matching the middleware config |
| `canActivate` / `canMatch` guards | Angular | Routes with guard references |
| `meta.requiresAuth` or `beforeEach` guards | Vue | Routes with auth meta or global guards |
| `<ProtectedRoute>` / `<AuthGuard>` wrappers | React | Routes wrapped in auth components |
| `[Authorize]` attribute | .NET | Controllers/actions with the attribute |

Also detect the **auth provider** by scanning the codebase:

| Detection signal | Auth provider |
|-----------------|---------------|
| `next-auth` or `@auth/core` in deps | **NextAuth / Auth.js** |
| `firebase` or `@firebase/auth` in deps | **Firebase Auth** |
| `@supabase/supabase-js` in deps | **Supabase Auth** |
| `@clerk/` in deps | **Clerk** |
| `@auth0/` in deps | **Auth0** |
| `passport` in deps | **Passport.js** |
| `@azure/msal-` in deps | **Azure AD / MSAL** |
| `Microsoft.AspNetCore.Identity` in `.csproj` | **.NET Identity** |
| Login form with email/password fields in code | **Custom form-based** |
| OAuth buttons (Google, GitHub, etc.) in login page | **OAuth/SSO** |

### 2. Interactive Auth Setup

**If protected routes were found**, ask the user how to authenticate. Do NOT assume env vars exist.

**Step A — Present findings to user:**
> "I found N routes total: X public, Y require authentication.
> Your app appears to use [detected auth provider].
> To audit the protected pages, I need to log in."

**Step B — Ask user based on detected auth type:**

**For form-based auth (email/password):**
> "I found a login form at [detected login route]. What test credentials should I use?"
- Ask for email/username and password
- Read the login page code to understand form field names, action URL, and submit behavior

**For OAuth/SSO (Google, GitHub, etc.):**
> "Your app uses OAuth. I can't click through OAuth popups automatically.
> Options:
> 1. Provide a session token/cookie from a logged-in browser session
> 2. If your auth provider has a test/credentials mode, provide those credentials
> 3. Skip authenticated pages and audit public pages only"

**For NextAuth/Auth.js with credentials provider:**
> Read the NextAuth config to check for `CredentialsProvider`. If found, use those credentials via the sign-in form.

**For Supabase/Firebase:**
> "Provide test user email and password — I'll authenticate via the SDK's sign-in method."

**Step C — Execute login:**
1. Navigate to the login page (detected from code or ask user for URL)
2. Read the login page source to find the exact form fields and submit button
3. Fill credentials and submit using Playwright
4. Wait for redirect and verify authentication succeeded (check for auth cookies, redirect to dashboard, etc.)
5. If login fails, report the error and ask user to verify credentials
6. Use the authenticated browser context for all subsequent protected page audits

**If NO protected routes found**, skip auth setup entirely and proceed.

### 3. Start Dev Server

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

### 4. Page Load Audit (Playwright)

For each discovered route, measure performance metrics using Playwright. See `page-metrics.js` in this directory for the collection script.

**Metrics collected per page:**
- **Core Web Vitals:** TTFB, FCP, LCP (with element identification), CLS (with shift sources)
- **DOM metrics:** Element count, script count, stylesheet count
- **Resource breakdown:** Total transfer, JS/CSS/image/font bytes
- **Third-party scripts:** External scripts with size and load duration
- **Image audit:** loading attribute, explicit dimensions, format
- **Font audit:** Font families, loading status, display strategy

For authenticated routes: use the browser context from Step 2.

Run each page **twice** and use the second run for metrics (first run warms caches).

### 5. Lighthouse Audit

Run Lighthouse CLI on each page:

```bash
npx lighthouse <url> --output=json --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo
```

For authenticated pages, extract cookies from the Playwright session and pass via `--extra-headers='{"Cookie": "<session-cookies>"}'`.

Note: Lighthouse may exit with code 1 on Windows due to Chrome temp dir cleanup — this is harmless if the JSON report was written.

### 6. Bundle Size Analysis

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

### 7. Image Optimization Check

For each page audited, check images collected by `page-metrics.js`:

| Check | Flag if |
|-------|---------|
| Lazy loading | Below-the-fold images without `loading="lazy"` |
| Explicit dimensions | Images missing `width`/`height` (causes CLS) |
| Next.js `<Image>` | Using `<img>` instead of `next/image` in Next.js projects |
| Format | Large images not in webp/avif format |
| Oversized | Image dimensions much larger than display size |

### 8. Third-Party Script Analysis

From `page-metrics.js` results, analyze third-party scripts:

- List all external scripts with size and load duration
- Flag scripts > 50 kB
- Flag scripts blocking the main thread > 100ms
- Suggest `async`/`defer` attributes or dynamic imports for non-critical scripts
- Common offenders: Google Analytics, chat widgets, ad scripts, social embeds

### 9. Font Loading Check

From `page-metrics.js` results, check font loading strategy:

| Check | Flag if |
|-------|---------|
| `font-display` | Missing or set to `block` (causes invisible text flash) |
| Preloading | Critical fonts not preloaded (`<link rel="preload">`) |
| Font count | More than 4 font files loaded |
| Font size | Total font bytes > 200 kB |
| Format | Using `.ttf`/`.otf` instead of `.woff2` |

### 10. Core Web Vitals

Check for `@vercel/speed-insights` or `web-vitals` in `package.json`. If the app is deployed, remind user to check real-user metrics (Vercel Speed Insights, Google Search Console).

### 11. Interaction Timing (if target is `full` or `interactions`)

Test common UI interactions using Playwright timing:

- **Search/command palette**: Keyboard shortcut to visible
- **Modal/dialog**: Click to fully rendered
- **Navigation**: Sidebar click to new content visible
- **Form submit**: Submit to response

Adapt selectors based on what route discovery reveals about the app's UI.

### 12. Comparison with Previous Run

If `perf-audit-results.json` exists, compare metrics:
- Flag regressions (>10% worse)
- Highlight improvements
- Show deltas

Save current results for future comparison.

## Summary Report

Present results covering:

1. **Framework & Rendering** — Framework, rendering strategy per route (SSR/SSG/CSR)
2. **Page Metrics Table** — FCP, LCP (with element), CLS (with sources), TTFB, DOM count, transfer size per page
3. **Lighthouse Scores** — Performance, Accessibility, Best Practices, SEO
4. **Bundle Sizes** — Total JS, top 10 chunks
5. **Image Optimization** — Issues found (missing lazy load, no dimensions, wrong format)
6. **Third-Party Scripts** — External scripts by size, blocking time
7. **Font Loading** — Font strategy issues
8. **Interaction Timing** — If measured
9. **Threshold Violations** — Any metric exceeding thresholds above
10. **Regressions** — Delta from previous run if available
11. **Recommendations** — Specific, actionable fixes ranked by impact

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Running audit without dev server | Start the server first or check if port is in use |
| Lighthouse on authenticated page without cookies | Extract cookies from Playwright session and pass via `--extra-headers` |
| Measuring metrics on first cold load only | Run twice, use second run for warm-cache metrics |
| Ignoring CLS because score looks low | CLS accumulates — check individual shift sources from the observer |
| Not saving results for regression tracking | Always write `perf-audit-results.json` for future comparison |
| Bundle analysis on dev build | Always run the production build command, not dev |
| Skipping auth pages entirely | Use interactive auth setup — most performance issues hide behind login |
| Not checking image optimization | Unoptimized images are the #1 cause of high LCP |
