import type { TextItem } from './types';

/** Operational challenges (homepage). Describes problems, not customer outcomes. */
export const challenges: TextItem[] = [
  {
    title: 'Fragmented systems',
    description: 'HR in one tool, inventory in another, invoices in a third. Every hand-off between them is a chance for information to drift.',
    verified: true,
  },
  {
    title: 'Manual coordination',
    description: 'Teams re-key the same data, chase approvals over email and reconcile spreadsheets before they can act.',
    verified: true,
  },
  {
    title: 'Limited visibility',
    description: 'When records live in different places, getting a reliable picture of people, orders or cash takes effort, and decisions wait.',
    verified: true,
  },
];

/**
 * Trust and transparency topics. Each is rendered with its text only when
 * `verified` is true. Unverified topics appear as placeholders in review mode.
 */
export const trustTopics: TextItem[] = [
  { title: 'Security', description: 'How customer data is protected.', verified: false, reviewNote: 'Supply verified security measures (encryption, hosting, testing).' },
  { title: 'Roles and permissions', description: 'How access is controlled within the application.', verified: false, reviewNote: 'Confirm role-based access capabilities.' },
  { title: 'Data handling', description: 'Where data is stored and how it is processed.', verified: false, reviewNote: 'Confirm hosting region, backups and retention.' },
  { title: 'Support', description: 'How customers get help.', verified: false, reviewNote: 'Confirm support channels and hours.' },
  { title: 'Reliability', description: 'How the service is operated and monitored.', verified: false, reviewNote: 'Confirm uptime commitments, if any.' },
];

/** Resources directory. Search/filters appear once enough content exists. */
export interface Resource {
  title: string;
  type: 'Guide' | 'Article' | 'Video' | 'Documentation';
  href: string;
  summary: string;
}
export const resources: Resource[] = [];
export const RESOURCE_SEARCH_THRESHOLD = 6;
