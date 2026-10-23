/**
 * Integrations directory. Add an entry ONLY with verified evidence that the
 * integration exists and works. The page and its search/filters are generated
 * from this list. Search and filters appear automatically once there are
 * enough entries to make them useful (see SEARCH_THRESHOLD).
 */
export type IntegrationStatus = 'available' | 'planned';

export interface Integration {
  name: string;
  category: 'Accounting' | 'Payments' | 'Communication' | 'Identity' | 'Storage' | 'Other';
  status: IntegrationStatus;
  products: ('hrms' | 'erp')[];
  description: string;
  /** Link to documentation or evidence. Required for 'available'. */
  evidence?: string;
}

export const integrations: Integration[] = [
  // No verified integrations have been supplied yet.
];

export const SEARCH_THRESHOLD = 6;

/**
 * Integration methods. `status: 'unconfirmed'` items are shown only in
 * content-review mode until the technical team confirms them.
 */
export const integrationMethods = [
  {
    title: 'API access',
    text: 'Programmatic access to Avyntro data for your own systems.',
    status: 'unconfirmed' as const,
  },
  {
    title: 'Data import and export',
    text: 'Bring existing records in, and take data out for reporting or migration.',
    status: 'unconfirmed' as const,
  },
  {
    title: 'Custom integration work',
    text: 'Discuss connecting Avyntro to a system that is not listed. Scope is agreed case by case.',
    status: 'on-request' as const,
  },
];
