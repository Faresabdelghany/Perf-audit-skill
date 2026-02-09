# Perf Audit Skill

A [Claude Code](https://claude.ai/code) skill that runs comprehensive performance audits on Next.js web applications.

## What it does

When you say "check performance", "run lighthouse", "audit speed", or `/perf`, Claude will:

1. **Discover all routes** in your Next.js app automatically
2. **Measure page load metrics** (FCP, LCP, CLS, TTFB, DOM count, transfer size) using Playwright
3. **Run Lighthouse audits** (Performance, Accessibility, Best Practices, SEO)
4. **Analyze bundle size** (top chunks, total JS)
5. **Flag regressions** against previous runs
6. **Suggest fixes** for any failing metrics

## Targets

| Target | Description |
|--------|-------------|
| `full` (default) | Everything: pages, interactions, Lighthouse, bundle |
| `pages` | Page load metrics only |
| `lighthouse` | Lighthouse audit only |
| `bundle` | Bundle size analysis only |
| `interactions` | UI interaction timing only |
| `vitals` | Core Web Vitals summary |

Usage: `/perf` or `/perf lighthouse`

## Installation

### Claude Code (CLI)

Copy the skill to your project:

```bash
mkdir -p .claude/skills/perf-audit
cp SKILL.md .claude/skills/perf-audit/SKILL.md
```

Or to your user-level skills (available in all projects):

```bash
mkdir -p ~/.claude/skills/perf-audit
cp SKILL.md ~/.claude/skills/perf-audit/SKILL.md
```

### Prerequisites

- **Next.js** application
- **Playwright** installed (`npx playwright install chromium`)
- For authenticated pages, add test credentials to `.env.local`:
  ```
  TEST_USER_EMAIL=<email>
  TEST_USER_PASSWORD=<password>
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
| Page        | FCP    | LCP    | CLS   | TTFB   | DOM  | Transfer |
|-------------|--------|--------|-------|--------|------|----------|
| /           | 0.8s   | 1.2s   | 0.01  | 120ms  | 450  | 245 kB   |
| /projects   | 0.9s   | 1.5s   | 0.02  | 135ms  | 620  | 312 kB   |
| /tasks      | 1.1s   | 1.8s   | 0.00  | 142ms  | 580  | 298 kB   |

Lighthouse: Performance 92 | Accessibility 98 | Best Practices 100 | SEO 100
Bundle: 487 kB total (142 chunks)
```

## License

MIT
