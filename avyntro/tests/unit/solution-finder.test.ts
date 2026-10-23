import { describe, expect, it } from 'vitest';
import { recommend, companySizes, functions, challengeOptions } from '@/lib/solution-finder';

describe('solution finder', () => {
  it('recommends HRMS for HR needs', () => {
    const r = recommend({ size: '11-50', fn: 'hr', challenge: 'manual' });
    expect(r.available.map((p) => p.id)).toEqual(['hrms']);
    expect(r.planned).toEqual([]);
    expect(r.cta.href).toBe('/book-demo?product=hrms');
  });

  it('never lists a planned product as available', () => {
    for (const s of companySizes) for (const f of functions) for (const c of challengeOptions) {
      const r = recommend({ size: s.value, fn: f.value, challenge: c.value });
      expect(r.available.every((p) => p.availability === 'live')).toBe(true);
      expect(r.planned.every((p) => p.availability !== 'live')).toBe(true);
      expect(r.cta.href).toMatch(/^\//);
    }
  });

  it('separates planned CRM from available ERP for sales', () => {
    const r = recommend({ size: '11-50', fn: 'sales', challenge: 'manual' });
    expect(r.available.map((p) => p.id)).toEqual(['erp']);
    expect(r.planned.map((p) => p.id)).toEqual(['crm']);
  });

  it('adds both live products for disconnected systems', () => {
    const r = recommend({ size: '51-250', fn: 'finance', challenge: 'disconnected' });
    expect(r.available.map((p) => p.id).sort()).toEqual(['erp', 'hrms']);
    expect(r.cta.href).toBe('/book-demo?product=both');
  });

  it('routes large organisations to sales', () => {
    expect(recommend({ size: '1000+', fn: 'whole', challenge: 'growth' }).cta.href).toBe('/contact');
  });

  it('is deterministic', () => {
    const a = recommend({ size: '1-10', fn: 'projects', challenge: 'visibility' });
    const b = recommend({ size: '1-10', fn: 'projects', challenge: 'visibility' });
    expect(a).toEqual(b);
  });
});
