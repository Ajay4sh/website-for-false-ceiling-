import { products } from '@/content/products';
import type { Product } from '@/content/types';

export const companySizes = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-250', label: '51–250 employees' },
  { value: '251-1000', label: '251–1,000 employees' },
  { value: '1000+', label: 'More than 1,000 employees' },
] as const;

export const functions = [
  { value: 'hr', label: 'HR and people' },
  { value: 'finance', label: 'Finance and accounting' },
  { value: 'operations', label: 'Operations, purchasing and inventory' },
  { value: 'sales', label: 'Sales and customers' },
  { value: 'projects', label: 'Projects and delivery' },
  { value: 'whole', label: 'The whole business' },
] as const;

export const challengeOptions = [
  { value: 'manual', label: 'Too much manual work and spreadsheets' },
  { value: 'disconnected', label: 'Disconnected systems' },
  { value: 'visibility', label: 'Limited visibility and reporting' },
  { value: 'growth', label: 'Processes not keeping up with growth' },
] as const;

export type CompanySize = (typeof companySizes)[number]['value'];
export type BusinessFunction = (typeof functions)[number]['value'];
export type Challenge = (typeof challengeOptions)[number]['value'];

export interface FinderInput { size: CompanySize; fn: BusinessFunction; challenge: Challenge }

export interface FinderResult {
  available: Product[];
  planned: Product[];
  notes: string[];
  /** Primary next step. */
  cta: { label: string; href: string };
}

const byFunction: Record<BusinessFunction, Product['id'][]> = {
  hr: ['hrms'],
  finance: ['erp'],
  operations: ['erp'],
  sales: ['crm', 'erp'],
  projects: ['project-management', 'hrms'],
  whole: ['hrms', 'erp'],
};

/**
 * Deterministic recommendation rules. Same input always gives the same output.
 * Products are split by real availability, so planned products are never
 * presented as available.
 */
export function recommend({ size, fn, challenge }: FinderInput): FinderResult {
  const ids = new Set<Product['id']>(byFunction[fn]);
  const notes: string[] = [];

  if (challenge === 'disconnected') {
    ids.add('hrms');
    ids.add('erp');
    notes.push('Using HRMS and ERP from the same platform reduces the number of separate systems your teams work across.');
  }
  if (challenge === 'visibility') {
    notes.push('Ask during your demo which reports and dashboards fit the questions you need answered.');
  }
  if (challenge === 'manual') {
    notes.push('Bring examples of the spreadsheets and manual steps you want to replace to your demo.');
  }
  if (challenge === 'growth') {
    notes.push('Avyntro is modular, so you can start with the products you need now and add more later.');
  }
  if (fn === 'sales') {
    notes.push('CRM is planned. Meanwhile, ERP covers sales orders and invoicing.');
  }
  if (fn === 'projects') {
    notes.push('Project management is planned. Meanwhile, HRMS covers people information such as availability and leave.');
  }

  const selected = products.filter((p) => ids.has(p.id));
  const available = selected.filter((p) => p.availability === 'live');
  const planned = selected.filter((p) => p.availability !== 'live');

  const enterprise = size === '251-1000' || size === '1000+';
  if (enterprise) notes.push('For larger organisations, our team can discuss enterprise pricing and requirements.');

  const cta = available.length === 0
    ? { label: 'Register interest', href: `/book-demo?intent=interest&product=${planned[0]?.id ?? 'crm'}` }
    : enterprise
      ? { label: 'Contact sales', href: '/contact' }
      : { label: 'Book a demo', href: `/book-demo?product=${available.length > 1 ? 'both' : available[0]!.id}` };

  return { available, planned, notes, cta };
}
