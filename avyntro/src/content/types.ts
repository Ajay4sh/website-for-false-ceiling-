/**
 * Shared content types.
 *
 * `verified` marks whether a statement has been checked against the real
 * product, contract or company record. Unverified content is shown with a
 * visible "Needs verification" marker while NEXT_PUBLIC_CONTENT_REVIEW=true.
 */

export type Availability = 'live' | 'planned' | 'tba';

export interface Verifiable {
  verified: boolean;
  /** Internal note for reviewers. Never rendered publicly. */
  reviewNote?: string;
}

export interface TextItem extends Verifiable {
  title: string;
  description: string;
}

export interface Capability extends TextItem {
  /** Illustrative workflow steps, if any. */
  steps?: string[];
}

export interface Product {
  id: 'hrms' | 'erp' | 'crm' | 'project-management' | 'more';
  name: string;
  shortName: string;
  availability: Availability;
  /** Route of the product page. Only live products with real content get one. */
  href?: string;
  tagline: string;
  purpose: TextItem;
  capabilities: Capability[];
  workflows: { title: string; steps: string[]; verified: boolean; note?: string }[];
  audiences: string[];
  seo?: { title: string; description: string };
}

export interface FaqItem extends Verifiable {
  question: string;
  answer: string;
  topic: 'HRMS' | 'ERP' | 'Availability' | 'Pricing' | 'Integrations' | 'Implementation' | 'Support';
}
