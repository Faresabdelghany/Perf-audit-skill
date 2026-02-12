# Perf Audit Plugin

A [Claude Code](https://claude.ai/code) plugin that runs comprehensive performance audits on web applications — supports **Next.js**, **Angular**, **Vue**, **React (Vite/CRA)**, and **.NET**.

## Supported Frameworks

| Framework | Detection | Route Discovery |
|-----------|-----------|-----------------|
| **Next.js** | `next.config.*` in project root | `app/` or `pages/` directory |
| **Angular** | `angular.json` in project root | Routing modules (`app.routes.ts`, `*-routing.module.ts`) |
| **Vue (Vite)** | `vite.config.*` + `vue` in deps | `vue-router` config in `src/router/` |
| **Vue (CLI)** | `vue.config.*` or `@vue/cli-service` in deps | `vue-router` config in `src/router/` |
| **React (Vite)** | `vite.config.*` + `react` in deps | Router config in `src/` |
| **React (CRA)** | `react-scripts` in deps | Router config in `src/` |
| **.NET** | `*.csproj` or `*.sln` files | Razor Pages, MVC Controllers, or Minimal APIs |

The framework is auto-detected. If detection fails, you'll be asked to specify.

## What it does

When you say "check performance", "run lighthouse", "audit speed", or `/perf-audit:perf-audit`, Claude will:

1. **Auto-detect your framework** and rendering strategy (SSR/SSG/CSR/ISR)
2. **Discover all routes** and detect which ones require authentication by reading your codebase
3. **Smart auth setup** — detects your auth provider (NextAuth, Firebase, Supabase, Clerk, Auth0, Passport, Azure AD, .NET Identity, OAuth) and asks you interactively for credentials
4. **Measure page load metrics** (FCP, LCP with element identification, CLS with shift sources, TTFB) using Playwright
5. **Run Lighthouse audits** (Performance, Accessibility, Best Practices, SEO)
6. **Analyze bundle size** (top chunks, total JS)
7. **Check image optimization** (lazy loading, dimensions, format, `next/image` usage)
8. **Analyze third-party scripts** (size, blocking time, async/defer suggestions)
9. **Check font loading** (font-display strategy, preloading, woff2 format, font count)
10. **Flag regressions** against previous runs
11. **Suggest fixes** ranked by impact

## Targets

| Target | Description |
|--------|-------------|
| `full` (default) | Everything: pages, interactions, Lighthouse, bundle, image/font/3P checks |
| `pages` | Page load metrics only |
| `lighthouse` | Lighthouse audit only |
| `bundle` | Bundle size analysis only |
| `interactions` | UI interaction timing only |
| `vitals` | Core Web Vitals summary |

Usage: `/perf-audit:perf-audit` or `/perf-audit:perf-audit lighthouse`

## Installation

### As a Plugin (Recommended)

Add the marketplace and install:

```bash
/plugin marketplace add Faresabdelghany/Perf-audit-skill
/plugin install perf-audit@perf-audit
```

### Manual Installation

Copy the skill directly to your project:

```bash
mkdir -p .claude/skills/perf-audit
cp skills/perf-audit/SKILL.md .claude/skills/perf-audit/SKILL.md
```

Or to your user-level skills (available in all projects):

```bash
mkdir -p ~/.claude/skills/perf-audit
cp skills/perf-audit/SKILL.md ~/.claude/skills/perf-audit/SKILL.md
```

## Prerequisites

- **Playwright** — auto-installed if missing (`npx playwright install chromium`)
- **Node.js 18+** (or .NET SDK 6.0+ for .NET projects)
- For Angular: Angular CLI (`npm i -g @angular/cli`)

No manual credential setup required — the skill detects your auth provider and asks you interactively.

## Smart Authentication

The skill reads your codebase to detect protected routes and your auth provider automatically.

**Supported auth providers:**

| Provider | How it's detected |
|----------|-------------------|
| NextAuth / Auth.js | `next-auth` or `@auth/core` in deps |
| Firebase Auth | `firebase` or `@firebase/auth` in deps |
| Supabase Auth | `@supabase/supabase-js` in deps |
| Clerk | `@clerk/` in deps |
| Auth0 | `@auth0/` in deps |
| Passport.js | `passport` in deps |
| Azure AD / MSAL | `@azure/msal-` in deps |
| .NET Identity | `Microsoft.AspNetCore.Identity` in `.csproj` |
| Custom form-based | Login form detected in code |
| OAuth/SSO | OAuth buttons detected in login page |

**How it works:**
1. Scans routes and detects which ones are protected (middleware, guards, wrappers)
2. Identifies your auth provider from `package.json` / project config
3. Asks you: "I found N protected routes. Your app uses [provider]. What are your test credentials?"
4. For OAuth/SSO: offers to accept a session cookie/token instead
5. Logs in via Playwright and audits all pages including authenticated ones

## Examples

### Next.js with NextAuth

```
> /perf-audit:perf-audit

Detected: Next.js (found next.config.mjs)
Rendering: SSR (app router with server components)
Discovering routes from app/ directory...
Found 12 routes (3 public, 9 authenticated)

Auth: NextAuth detected (found next-auth in package.json)
Protected routes use middleware.ts matcher for /dashboard/*
I found a credentials provider in your NextAuth config.
What test credentials should I use?

> email: test@example.com, password: test123

Logging in via /auth/signin...
Login successful. Auditing all 12 routes...
```

### Angular

```
> /perf-audit:perf-audit

Detected: Angular (found angular.json)
Discovering routes from app.routes.ts...
Found 10 routes (3 public, 7 with canActivate guards)

Auth: Custom form-based login detected at /login
What test credentials should I use?

> username: admin, password: admin123

Logging in... Login successful.
Auditing all 10 routes...
```

### React (Vite) with no auth

```
> /perf-audit:perf-audit

Detected: React (Vite) (found vite.config.ts + react in package.json)
Discovering routes from src/router.tsx...
Found 6 routes (all public, no auth required)

Auditing all 6 routes...
```

## Thresholds

The skill flags any page exceeding:

| Metric | Threshold |
|--------|-----------|
| LCP | > 2.5s |
| FCP | > 1.8s |
| CLS | > 0.1 |
| TTFB | > 800ms |

## Example Output

```
Framework: Next.js (auto-detected)
Rendering: SSR (server components) | 3 SSG pages | 1 CSR page

Page Metrics (warm cache):
| Page        | FCP    | LCP    | LCP Element | CLS   | TTFB   | DOM  | Transfer |
|-------------|--------|--------|-------------|-------|--------|------|----------|
| /           | 0.8s   | 1.2s   | <img>       | 0.01  | 120ms  | 450  | 245 kB   |
| /projects   | 0.9s   | 1.5s   | <h1>        | 0.02  | 135ms  | 620  | 312 kB   |
| /dashboard  | 1.1s   | 1.8s   | <div>       | 0.00  | 142ms  | 580  | 298 kB   |

Lighthouse: Performance 92 | Accessibility 98 | Best Practices 100 | SEO 100
Bundle: 487 kB total (142 chunks)

Image Issues:
- /projects: 3 images missing loading="lazy"
- /dashboard: hero image using <img> instead of next/image (245 kB, not optimized)

Third-Party Scripts:
- Google Analytics: 28 kB (async)
- Intercom widget: 89 kB (render-blocking!) — suggest dynamic import

Font Loading:
- 2 fonts loaded, all woff2, font-display: swap — OK

Recommendations:
1. Convert hero image to next/image with priority prop (fixes LCP on /dashboard)
2. Lazy-load Intercom widget after page interactive (saves 89 kB blocking JS)
3. Add loading="lazy" to below-fold images on /projects
```

## Plugin Structure

```
Perf-audit-skill/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest
│   └── marketplace.json     # Marketplace config
├── skills/
│   └── perf-audit/
│       ├── SKILL.md           # The skill definition
│       ├── page-metrics.js    # Playwright metrics collection script
│       └── bundle-analysis.js # Bundle size analysis script
├── README.md
└── LICENSE
```

## License

MIT
