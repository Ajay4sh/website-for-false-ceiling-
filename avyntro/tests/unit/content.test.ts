import { describe, expect, it } from 'vitest';
import { products } from '@/content/products';
import { industries, publishedIndustries } from '@/content/solutions';
import { integrations } from '@/content/integrations';
import { pricing } from '@/content/pricing';
import { site } from '@/content/site';

describe('content integrity', () => {
  it('only live products have product pages', () => {
    for (const p of products) {
      if (p.availability !== 'live') expect(p.href).toBeUndefined();
      else expect(p.href).toBe(`/products/${p.id}`);
    }
  });
  it('HRMS and ERP are live; CRM and PM planned; more is TBA', () => {
    const status = Object.fromEntries(products.map((p) => [p.id, p.availability]));
    expect(status).toEqual({ hrms: 'live', erp: 'live', crm: 'planned', 'project-management': 'planned', more: 'tba' });
  });
  it('published industry pages have distinct, non-empty content', () => {
    const pub = publishedIndustries();
    expect(pub.length).toBeGreaterThan(0);
    const summaries = new Set(pub.map((i) => i.summary));
    expect(summaries.size).toBe(pub.length);
    for (const i of pub) {
      expect(i.challenges.length).toBeGreaterThanOrEqual(2);
      expect(i.applications.length).toBeGreaterThan(0);
      for (const a of i.applications) expect(products.find((p) => p.id === a.product)?.availability).toBe('live');
    }
    expect(industries.filter((i) => !i.published).every((i) => !pub.includes(i))).toBe(true);
  });
  it('available integrations cite evidence', () => {
    for (const i of integrations) if (i.status === 'available') expect(i.evidence).toMatch(/^https:\/\//);
  });
  it('no prices are published in demo-led mode', () => {
    if (pricing.mode === 'demo-led') expect(pricing.plans.every((p) => p.price === null)).toBe(true);
  });
  it('no contact details are invented', () => {
    expect(Object.values(site.contact).every((v) => v === null)).toBe(true);
    expect(site.social).toEqual([]);
  });
});
