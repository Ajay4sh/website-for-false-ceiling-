import { siteUrl } from '@/lib/env';
import { site } from '@/content/site';

/** Renders JSON-LD safely: "<" is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

const abs = (path: string) => (siteUrl ? new URL(path, siteUrl + '/').href : null);

/** Structured data needs absolute URLs, so it is emitted only when the production URL is configured. */
export function organizationLd() {
  if (!siteUrl) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: abs('/'),
    slogan: site.tagline,
    ...(site.social.length ? { sameAs: site.social.map((s) => s.href) } : {}),
  };
}

export function websiteLd() {
  if (!siteUrl) return null;
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: abs('/') };
}

export function breadcrumbLd(items: { name: string; href: string }[]) {
  if (!siteUrl) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href) })),
  };
}

/** SoftwareApplication without ratings/offers: only fields we can state accurately. */
export function softwareLd(name: string, description: string, path: string) {
  if (!siteUrl) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    applicationCategory: 'BusinessApplication',
    url: abs(path),
    publisher: { '@type': 'Organization', name: site.name },
  };
}
