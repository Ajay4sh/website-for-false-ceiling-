# SEO checklist

| Item | Status | Where |
|---|---|---|
| Page-specific titles and descriptions | Done | `pageMetadata()` in each `page.tsx` |
| Canonical URLs | Done (when `NEXT_PUBLIC_SITE_URL` is set) | `src/lib/seo.ts` |
| Open Graph and Twitter metadata | Done | `seo.ts`, generated `opengraph-image.tsx` |
| Sitemap | Done: indexable pages only, production URL only | `src/app/sitemap.ts` |
| robots.txt | Done: blocks everything until a production URL is set; then allows all except `/api/` | `src/app/robots.ts` |
| noindex for draft or thin pages | Done: privacy and terms (draft), resources (empty), 404 | page metadata |
| Crawlable content | Done: all copy is server-rendered HTML; interactive widgets enhance it | n/a |
| Heading hierarchy | Done: one H1 per page (e2e-tested), H2 per section | n/a |
| Internal linking | Done: nav, footer, product cross-links, industry links, breadcrumbs. No broken links (e2e crawl). | n/a |
| Custom 404 | Done: returns HTTP 404 (e2e-tested) | `src/app/not-found.tsx` |
| Redirects | Done: `/demo` → `/book-demo`, `/hrms` → `/products/hrms`, `/erp` → `/products/erp` | `next.config.ts` |
| Structured data | Organization, WebSite, BreadcrumbList, SoftwareApplication (no ratings, offers or reviews, since none can be stated accurately) | `src/components/layout/JsonLd.tsx` |
| No duplicate industry pages | Enforced by a unit test (distinct summaries; unpublished entries 404) | `tests/unit/content.test.ts` |
| Lighthouse SEO | **100** on `/` and `/products/erp` with a production URL configured; 63 without it (by design, because of `noindex`) | n/a |

## Before launch

- [ ] Set `NEXT_PUBLIC_SITE_URL` in production only.
- [ ] Replace the placeholder logo and add a branded OG image if desired.
- [ ] Review titles and descriptions once product content is verified.
- [ ] Submit the sitemap in Google Search Console and Bing Webmaster Tools.
- [ ] Publish resources (guides, documentation) to build topical authority. The page becomes indexable automatically.
