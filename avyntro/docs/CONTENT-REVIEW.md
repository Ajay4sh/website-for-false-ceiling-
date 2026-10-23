# Content requiring verification

The brief supplied **no product specifications, customer evidence, company facts, prices, integrations or contact details**. Nothing of that kind was invented. Where the site needs content to function, it uses clearly marked drafts.

While `NEXT_PUBLIC_CONTENT_REVIEW=true` (the default), every unverified item shows a **Needs verification**, **Provisional**, **Unconfirmed** or **Placeholder** marker. Work through this list, update `src/content/`, set `verified: true` on each item, then set `NEXT_PUBLIC_CONTENT_REVIEW=false`.

## Established facts from the brief (used as-is)

- Brand name, tagline, headline and supporting message (marked provisional in the brief).
- HRMS and ERP are live; CRM and project management are planned; more products are to be announced.
- Business model: subscription-based, modular, enterprise pricing where appropriate.
- Target customers: small businesses and startups, SMEs, mid-market, enterprise.

## Needs product verification (`src/content/products.ts`)

| Item | Question to answer |
|---|---|
| HRMS purpose statement | Is the wording accurate? |
| HRMS capabilities: employee records, attendance and time, leave, payroll inputs, onboarding, self-service | Which exist in the live product? Is payroll *processing* supported, or only inputs? |
| HRMS workflows: leave request, employee onboarding | Do these match the real flows and step names? |
| ERP purpose statement | Is the wording accurate? |
| ERP capabilities: purchasing, inventory, sales orders, invoicing, accounting, reporting | Which exist? What is the accounting scope (GL, AP/AR, tax)? Is manufacturing or production planning supported? |
| ERP workflows: order to invoice, procure to stock | Do these match the product? |
| Product explorer and product pages | Replace illustrative previews with real screenshots when available, and update the captions. |

## Needs commercial verification

| Item | File |
|---|---|
| Plan names Starter, Growth and Enterprise, and their audiences | `pricing.ts` (`verified: false`) |
| Prices and entitlements (currently none shown) | `pricing.ts` |
| Whether single-module subscriptions exist | `faqs.ts` |
| Implementation process and timelines | `faqs.ts` |
| Support channels, hours and SLAs | `faqs.ts`, `misc.ts` (trust topics) |

## Needs technical and security verification (`src/content/misc.ts`, `integrations.ts`)

- Security measures, roles and permissions, data handling (hosting region, backups, retention), support, reliability. **The Trust section publishes nothing until these are verified.**
- API availability and data import/export (hidden from the public until confirmed).
- Every integration, with an evidence link for each "available" one.

## Needs company information (`src/content/site.ts`)

- Legal entity name, founding year, headquarters.
- Sales and support email, phone, address.
- Official social media accounts.
- Final logo (the current mark is a placeholder).
- Application sign-in URL (`NEXT_PUBLIC_APP_SIGNIN_URL`).

## Needs review: industry use cases (`src/content/solutions.ts`)

Professional services, distribution and manufacturing are published as **proposed use cases** with a visible disclaimer. Confirm each one's challenges and applications are reasonable for the product, or set `published: false`. Retail is unpublished.

## Needs legal review

- `/privacy` and `/terms` are placeholder structures (noindex, with a visible draft banner). They must be written and approved by counsel before launch.
- The form consent wording in `DemoForm.tsx`.
