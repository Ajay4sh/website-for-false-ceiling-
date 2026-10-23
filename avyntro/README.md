# Avyntro website

Marketing website for **Avyntro: Business, Connected.** A B2B site for the Avyntro HRMS and ERP products, built with Next.js (App Router), React, TypeScript and Tailwind CSS.

The marketing site is separate from the Avyntro application. It does not include a customer portal or authentication. A **Sign in** link appears only when an application URL is configured.

> **Before launch:** read [`docs/CONTENT-REVIEW.md`](docs/CONTENT-REVIEW.md). Product capability text, plan names, industry use cases and legal pages are drafts. They are marked **Needs verification** on the site until `NEXT_PUBLIC_CONTENT_REVIEW=false`.

## Quick start

```bash
cd avyntro
npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev                  # http://localhost:3000
```

Requires Node.js 20.9 or newer (developed on Node 22).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Unit tests (Vitest): contrast, form schema and handler, solution finder rules, content integrity |
| `npm run test:e2e` | Browser tests (Playwright) at desktop, tablet and mobile sizes, including axe accessibility checks. Run `npm run build` first. |
| `npm run check` | typecheck + lint + unit tests + build |

The e2e suite starts the production server **and a local webhook stub**, so the demo form is tested end to end: real API route, real validation, real delivery. Nothing is mocked. If Chromium is not installed, run `npx playwright install chromium` once.

## Configuration

All configuration is through environment variables (see [`.env.example`](.env.example)). Secrets are read only on the server.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production origin, e.g. `https://www.your-domain.com`. **Until set, the site is `noindex` and `robots.txt` disallows crawling**, so preview deployments are never indexed. Also enables canonical URLs, sitemap and structured data. |
| `NEXT_PUBLIC_APP_SIGNIN_URL` | Application login URL. The Sign in link is hidden until this is set. |
| `NEXT_PUBLIC_CONTENT_REVIEW` | `true` (default) shows "Needs verification" markers on unverified content. Set `false` only after the content review. |
| `DEMO_DELIVERY` | `webhook` or `resend`. **If unset, the form returns an error and never shows success.** |
| `DEMO_WEBHOOK_URL`, `DEMO_WEBHOOK_SECRET` | Webhook mode: POSTs JSON to your CRM or automation endpoint. When a secret is set, the body is signed with HMAC-SHA256 in `X-Avyntro-Signature`. |
| `RESEND_API_KEY`, `DEMO_NOTIFY_TO`, `DEMO_NOTIFY_FROM` | Resend mode: sends a plain-text email for each request. |
| `DEMO_RATE_LIMIT_MAX`, `DEMO_RATE_LIMIT_WINDOW_SECONDS` | Per-IP form rate limit (default 5 per 10 minutes). |

`NEXT_PUBLIC_*` values are baked in at build time, so rebuild after changing them.

## Project structure

```
src/
  app/                    Routes (App Router). One folder per page.
    api/demo/route.ts     Demo/contact/interest form endpoint
    sitemap.ts, robots.ts, opengraph-image.tsx, not-found.tsx
  components/
    ui/                   Reusable primitives: Button, StatusBadge, Section, Accordion, ReviewMarker, Logo, Breadcrumbs
    layout/               Header (accessible dropdowns + mobile menu), Footer, JSON-LD helpers
    sections/             Page sections: PageHero, ProductPage template, FAQ, Trust, ConnectedWorkflows, FinalCta, LegalPage
    interactive/          Client components: ProductExplorer, SolutionFinder, DemoForm, IntegrationExplorer
    previews/             Illustrative product UI (fictional sample data, always labelled)
  content/                ALL copy and data: products, availability, solutions, integrations, pricing, FAQs, company details
  lib/
    env.ts, seo.ts        Public configuration and metadata helpers
    solution-finder.ts    Deterministic recommendation rules
    demo/                 Form schema (shared client/server), handler, rate limiter, delivery adapters
  styles/
    tokens.css            Design tokens: the single place to change the brand
    globals.css
tests/
  unit/                   Vitest
  e2e/                    Playwright + webhook stub
docs/                     Deployment, security, SEO, content review, status
```

## Editing content

Everything visitors read lives in `src/content/`:

- **Product availability** (`products.ts`): change `availability` (`live`, `planned`, `tba`). Badges, the explorer, the solution finder, the footer and navigation all follow it. Only live products get a product page.
- **Capabilities and workflows** (`products.ts`): set `verified: true` once confirmed against the application.
- **Industry pages** (`solutions.ts`): a page is generated only when `published: true` and the entry has its own content (enforced by a unit test).
- **Integrations** (`integrations.ts`): add only verified integrations. `available` entries must link to evidence. Search and filters appear automatically from 6 entries upward.
- **Pricing** (`pricing.ts`): `mode: 'demo-led'` shows no prices. Switch to `'published'` and fill in `price` and `entitlements` once confirmed.
- **Company and contact details** (`site.ts`): `null` fields are not rendered. Nothing is invented.
- **Resources** (`misc.ts`): the page is `noindex` until it has content.

## Design system

`src/styles/tokens.css` defines colours (the supplied brand palette plus accessible derivatives), typography, spacing (4px base), containers, radii, shadows, motion, focus rings, z-index and breakpoints as Tailwind v4 theme tokens. Change a value there and the whole site updates.

`tests/unit/contrast.test.ts` reads the token file and checks every text/background pairing against WCAG AA. It caught that the brand blue `#3B82F6` is below 4.5:1 on white, which is why `--color-primary-strong` exists for buttons and links.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
