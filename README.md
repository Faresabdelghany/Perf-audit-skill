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

1. **Auto-detect your framework** (Next.js, Angular, Vue, React, or .NET)
2. **Discover all routes** in your app automatically
3. **Measure page load metrics** (FCP, LCP, CLS, TTFB, DOM count, transfer size) using Playwright
4. **Run Lighthouse audits** (Performance, Accessibility, Best Practices, SEO)
5. **Analyze bundle size** (top chunks, total JS)
6. **Flag regressions** against previous runs
7. **Suggest fixes** for any failing metrics

## Targets

| Target | Description |
|--------|-------------|
| `full` (default) | Everything: pages, interactions, Lighthouse, bundle |
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

- **Playwright** installed (`npx playwright install chromium`)
- For authenticated pages, add test credentials to `.env.local` (or your framework's env file):
  ```
  TEST_USER_EMAIL=<email>
  TEST_USER_PASSWORD=<password>
  ```

### Framework-specific

| Framework | Additional requirement |
|-----------|----------------------|
| Next.js | Node.js 18+ |
| Angular | Node.js 18+, Angular CLI (`npm i -g @angular/cli`) |
| Vue (Vite/CLI) | Node.js 18+ |
| React (Vite/CRA) | Node.js 18+ |
| .NET | .NET SDK 6.0+ |

## Examples

### Next.js

```
> /perf-audit:perf-audit

Detected: Next.js (found next.config.mjs)
Discovering routes from app/ directory...
Found 12 routes (3 public, 9 authenticated)
...
```

### Angular

```
> /perf-audit:perf-audit

Detected: Angular (found angular.json)
Discovering routes from app.routes.ts...
Found 10 routes (3 public, 7 authenticated)
...
```

### Vue

```
> /perf-audit:perf-audit

Detected: Vue (Vite) (found vite.config.ts + vue in package.json)
Discovering routes from src/router/index.ts...
Found 9 routes (2 public, 7 authenticated)
...
```

### React (Vite)

```
> /perf-audit:perf-audit

Detected: React (Vite) (found vite.config.ts + react in package.json)
Discovering routes from src/router.tsx...
Found 8 routes (2 public, 6 authenticated)
...
```

### .NET

```
> /perf-audit:perf-audit

Detected: .NET (found MyApp.csproj)
Discovering routes from Controllers/ and Pages/...
Found 15 routes (5 public, 10 authenticated)
...
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

| Page        | FCP    | LCP    | CLS   | TTFB   | DOM  | Transfer |
|-------------|--------|--------|-------|--------|------|----------|
| /           | 0.8s   | 1.2s   | 0.01  | 120ms  | 450  | 245 kB   |
| /projects   | 0.9s   | 1.5s   | 0.02  | 135ms  | 620  | 312 kB   |
| /tasks      | 1.1s   | 1.8s   | 0.00  | 142ms  | 580  | 298 kB   |

Lighthouse: Performance 92 | Accessibility 98 | Best Practices 100 | SEO 100
Bundle: 487 kB total (142 chunks)
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
