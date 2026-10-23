import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
import { indexableRoutes } from '@/lib/seo';
import { publishedIndustries } from '@/content/solutions';
import { resources } from '@/content/misc';

/** Lists only indexable pages, and only once the production URL is configured. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];
  const extra = [
    ...publishedIndustries().map((i) => `/solutions/industries/${i.slug}`),
    ...(resources.length ? ['/resources'] : []),
  ];
  return indexableRoutes(extra).map((path) => ({
    url: new URL(path, siteUrl + '/').href,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : path.startsWith('/products/') || path === '/book-demo' ? 0.8 : 0.6,
  }));
}
