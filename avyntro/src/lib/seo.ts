import type { Metadata } from 'next';
import { site } from '@/content/site';
import { indexable, siteUrl } from './env';

interface PageMeta {
  title: string;
  description: string;
  path: string;
  /** Force noindex, e.g. for draft legal pages or empty directories. */
  noindex?: boolean;
}

export function pageMetadata({ title, description, path, noindex }: PageMeta): Metadata {
  const index = indexable && !noindex;
  return {
    title,
    description,
    alternates: siteUrl ? { canonical: path } : undefined,
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: `${title} | ${site.name}`,
      description,
      url: siteUrl ? path : undefined,
      siteName: site.name,
      type: 'website',
      locale: 'en_GB',
    },
    twitter: { card: 'summary_large_image', title: `${title} | ${site.name}`, description },
  };
}

/** Routes for the sitemap. Excludes noindex pages. */
export const indexableRoutes = (extra: string[] = []) => [
  '/', '/platform', '/products', '/products/hrms', '/products/erp', '/solutions',
  '/integrations', '/pricing', '/about', '/contact', '/book-demo', ...extra,
];
