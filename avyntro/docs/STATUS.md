# Implementation status

Report date: 2026-10-23. All results below come from commands actually run against the production build.

## Stages

| Stage | Status | Notes |
|---|---|---|
| 1. Discovery and architecture | Done | The repo held an unrelated Astro site, so Avyntro was initialised in `avyntro/`. Stack: Next.js 16, React 19, TypeScript 5.9, Tailwind 4, Zod 4, Vitest, Playwright, axe. TypeScript 7 was available but skipped for Next.js compatibility. |
| 2. Tokens and component library | Done | `src/styles/tokens.css`; contrast unit-tested (it found and fixed two failing pairings). |
| 3. Navigation, homepage, layouts | Done | All 13 homepage sections (A–M) in the specified order. |
| 4. HRMS and ERP pages | Done | Shared `ProductPage` template. Capability content is draft (see CONTENT-REVIEW.md). |
| 5. Solutions, integrations, pricing, company pages | Done | Industry template with 3 proposed use cases; integrations directory (empty: none verified); demo-led pricing; about; contact; resources (noindex while empty); legal placeholders. |
| 6. Interactive features | Done | Product explorer, solution finder, demo, sales and interest form with a real backend boundary, and an integration explorer (search and filters activate at 6 or more entries). |
| 7. SEO, accessibility, performance, security | Done | See SEO.md, SECURITY.md and the results below. |
| 8. Tests and documentation | Done | This folder plus the README. |

## Routes

`/`, `/platform`, `/products`, `/products/hrms`, `/products/erp`, `/integrations`, `/solutions`, `/solutions/industries/[industry]` (professional-services, distribution, manufacturing), `/pricing`, `/about`, `/contact`, `/book-demo`, `/resources`, `/privacy`, `/terms`, custom 404, `/api/demo`, `/sitemap.xml`, `/robots.txt`, `/opengraph-image`.

There are no pages for planned products (CRM, project management) because their scope has not been announced. They appear with **Planned** badges and an interest-registration path instead.

## Verification results

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass (0 problems) |
| `npm test` (Vitest) | **48 / 48 pass**: contrast (24 pairs), form schema, handler (success, 503, 502, 422, 413, 415, honeypot, timing, rate limit), delivery adapters, solution-finder rules (all 120 input combinations), content integrity |
| `npm run build` | Pass: 22 routes, all marketing pages static |
| `npm run test:e2e` (Playwright, 3 viewports) | **128 pass**, 7 skipped by design (viewport-specific tests). Covers every route (200, one H1, no console errors, no horizontal overflow), link crawl (no broken links), 404, keyboard navigation and dropdowns, mobile menu, skip link, product explorer (click and arrow keys), solution finder, form validation, **end-to-end submission through a real webhook stub (with signature)**, failure path showing an error, double-submit protection, query pre-selection, API rejections, security headers, robots behaviour, and axe WCAG 2.2 A/AA on 9 pages plus the error state |
| Lighthouse, mobile (no production URL) | `/`: Perf 96, A11y 100, BP 100 · `/products/hrms`: Perf 98, A11y 100, BP 100 · `/book-demo`: Perf 96, A11y 100, BP 100 |
| Lighthouse, desktop | Perf 100, A11y 100, BP 100 on all three pages |
| Lighthouse SEO | 100 with `NEXT_PUBLIC_SITE_URL` set; 63 without (intentional `noindex`) |
| `npm audit --omit=dev` | 0 vulnerabilities |

Issues found and fixed during testing:

- Primary-on-highlight text contrast was 4.24:1; a new token brings it to AA.
- The preview caption failed contrast because of an opacity setting.
- `backdrop-filter` on the header trapped the fixed mobile menu inside the header.
- The `upgrade-insecure-requests` CSP directive broke non-TLS serving.
- Zod's eval probe triggered CSP violations; Zod now runs in jitless mode.
- A 600 ms style/layout cost from a large blur filter took homepage mobile performance from 79 to 96 once replaced.

Lighthouse figures are lab measurements on this container (simulated throttling), not a guarantee of field Core Web Vitals.

## Not implemented, by decision

- **ROI calculator**: no credible, verifiable assumptions exist yet. Implement only once real customer or benchmark data is available.
- **Resource search**: there are no resources. The directory renders a simple list once content exists. A search threshold constant is in place for when it grows.
- **Sign-in, customer portal and authentication**: out of scope for a marketing site. The link appears only when `NEXT_PUBLIC_APP_SIGNIN_URL` is set.
- **Analytics and cookie consent**: none installed. Add consent before adding analytics.

## Remaining dependencies (need input from Avyntro)

1. Verified product capabilities and workflows for HRMS and ERP, plus real screenshots.
2. Commercial model: plan names, prices or a decision to stay demo-led, entitlements, single-module availability.
3. Security, data-handling and support facts for the Trust section.
4. Verified integrations, and confirmation of API and import/export capabilities.
5. Company details, contact details, official social accounts and the final logo.
6. Production domain (`NEXT_PUBLIC_SITE_URL`) and the application sign-in URL.
7. Form delivery target: a CRM webhook, or Resend with a verified sender domain. **Until configured, the live form returns an error by design.**
8. Legal review of privacy, terms and the consent wording.

## Assumptions requiring approval

- British English spelling (`en-GB`) and copy tone.
- Plan audiences: Starter = small businesses and startups, Growth = SMEs, Enterprise = mid-market and enterprise.
- Industry choices (professional services, distribution, manufacturing) published as *proposed* use cases.
- Placeholder logo mark (connected "A").
- Example workflows (leave request, onboarding, order to invoice, procure to stock, lead to invoice).
- Deploying from the `avyntro/` subfolder of this repository. It can be moved to a dedicated repository unchanged.

## Not executed

- Real webhook or Resend delivery against a production endpoint: no credentials were supplied. The boundary is implemented and tested against a local stub.
- Manual screen-reader testing (NVDA, VoiceOver): automated axe checks and keyboard e2e tests were run instead.
- Cross-browser runs in Firefox and WebKit: only Chromium is installed in this environment. The config can add them with `npx playwright install`.
