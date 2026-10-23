import type { Product } from './types';

/**
 * Proposed industry use cases. These describe how Avyntro's live products
 * could apply to common needs in each sector. They are NOT claims of existing
 * customers or proven specialisation. A page is generated only when
 * `published` is true AND the entry has its own distinct content.
 */
export interface Industry {
  slug: string;
  name: string;
  published: boolean;
  summary: string;
  challenges: string[];
  /** How live products may apply. Keep specific to the industry. */
  applications: { product: Product['id']; text: string }[];
  verified: boolean;
}

export const industries: Industry[] = [
  {
    slug: 'professional-services',
    name: 'Professional services',
    published: true,
    summary:
      'Consultancies, agencies and firms whose main asset is their people need accurate employee data and a clear view of the business behind client work.',
    challenges: [
      'Employee, leave and attendance information spread across spreadsheets and email',
      'Onboarding new joiners consistently while teams are busy with client work',
      'Linking invoicing and financial records to the work being delivered',
    ],
    applications: [
      { product: 'hrms', text: 'Keep employee records, leave and attendance in one place so managers can plan who is available.' },
      { product: 'erp', text: 'Manage invoicing and financial records alongside the rest of business operations.' },
    ],
    verified: false,
  },
  {
    slug: 'distribution',
    name: 'Distribution and wholesale',
    published: true,
    summary:
      'Distributors move goods between suppliers and customers every day. Stock, orders and invoices need to stay in step.',
    challenges: [
      'Stock levels that differ between the warehouse and the office',
      'Orders re-keyed between sales, warehouse and accounts',
      'Limited visibility of what has been ordered, shipped and invoiced',
    ],
    applications: [
      { product: 'erp', text: 'Follow purchase orders, stock movements, sales orders and invoices in a single flow.' },
      { product: 'hrms', text: 'Manage attendance and leave for warehouse and office teams.' },
    ],
    verified: false,
  },
  {
    slug: 'manufacturing',
    name: 'Manufacturing',
    published: true,
    summary:
      'Manufacturers coordinate materials, production teams and customer orders. Disconnected tools make that coordination harder.',
    challenges: [
      'Raw material purchasing that is not linked to customer demand',
      'Shift attendance and leave tracked separately from planning',
      'Delays between order completion and invoicing',
    ],
    applications: [
      { product: 'erp', text: 'Connect purchasing and inventory of materials with customer orders and invoicing.' },
      { product: 'hrms', text: 'Keep attendance and leave for shift-based teams in one system.' },
    ],
    verified: false,
    // Production planning / MRP is not listed: confirm before adding.
  },
  {
    slug: 'retail',
    name: 'Retail',
    published: false, // Not published until retail-specific content is confirmed.
    summary: '',
    challenges: [],
    applications: [],
    verified: false,
  },
];

export const publishedIndustries = () => industries.filter((i) => i.published && i.challenges.length > 0);

/** Business-need groupings shown on /solutions. */
export const needs = [
  {
    title: 'Growing businesses replacing spreadsheets',
    text: 'Move day-to-day HR and operational records out of spreadsheets into structured, shared systems.',
    products: ['hrms', 'erp'] as Product['id'][],
  },
  {
    title: 'HR and people operations',
    text: 'Give HR a single place for employee records and requests, and give managers clearer information.',
    products: ['hrms'] as Product['id'][],
  },
  {
    title: 'Operations and finance',
    text: 'Connect purchasing, inventory, sales and invoicing so teams work from the same data.',
    products: ['erp'] as Product['id'][],
  },
  {
    title: 'Sales and customer management',
    text: 'Customer relationship management is planned. Register interest to hear when it is available.',
    products: ['crm'] as Product['id'][],
  },
];
