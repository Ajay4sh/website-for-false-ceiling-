import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Built-in illustrations used when an item has no photo yet.
// The admin panel saves an empty value when a dropdown is left blank, so treat '' as "not set".
const blank = (v: unknown) => (v === '' || v === null ? undefined : v);
const art = z.preprocess(blank, z.enum(['cove', 'round', 'wood', 'grid', 'baffle', 'pvc']).default('cove'));

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    seoTitle: z.string().nullish(),
    seoDescription: z.string().nullish(),
    image: z.string().nullish(),
    art,
    priceNote: z.string().nullish(),
    idealFor: z.array(z.string()).nullish().transform((v) => v ?? []),
    benefits: z.array(z.string()).nullish().transform((v) => v ?? []),
    order: z.preprocess(blank, z.number().default(99)),
  }),
});

const designs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/designs' }),
  schema: z.object({
    title: z.string(),
    category: z.preprocess(blank, z.enum(['Home', 'Commercial']).default('Home')),
    room: z.string().nullish(),
    material: z.string().nullish(),
    location: z.string().nullish(),
    image: z.string().nullish(),
    art,
    featured: z.boolean().default(false),
    order: z.preprocess(blank, z.number().default(99)),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string().nullish(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { services, designs, blog };
