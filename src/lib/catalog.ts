import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIES, type Category } from './constants';

export { ART, CATEGORIES, MENUS, type Category } from './constants';

export const categoryId = (c: string) => c.toLowerCase();

/** Services marked "Show on website", sorted by order. */
export async function getServices(): Promise<CollectionEntry<'services'>[]> {
  return (await getCollection('services', (s) => s.data.show)).sort((a, b) => a.data.order - b.data.order);
}

/** Visible services grouped by category, skipping empty categories. */
export async function getServiceGroups(categories: readonly Category[] = CATEGORIES) {
  const services = await getServices();
  return categories
    .map((category) => ({ category, items: services.filter((s) => s.data.category === category) }))
    .filter((g) => g.items.length > 0);
}
