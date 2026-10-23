/**
 * Company-level content. Every field that is `null` is unknown and is simply
 * not rendered. Fill these in only with verified information.
 */
export const site = {
  name: 'Avyntro',
  tagline: 'Business, Connected.',
  description:
    'Avyntro is a modular business management platform. Manage people, processes and business operations with integrated HRMS and ERP software.',
  hero: {
    headline: 'Run your business on a more connected platform.',
    subheadline:
      "Manage people, processes and business operations with Avyntro's integrated HRMS and ERP solutions.",
  },
  /** Verified company facts. Leave null until confirmed. */
  company: {
    legalName: null as string | null,
    founded: null as string | null,
    headquarters: null as string | null,
  },
  /** Public contact details. Leave null until confirmed; nothing is invented. */
  contact: {
    salesEmail: null as string | null,
    supportEmail: null as string | null,
    phone: null as string | null,
    address: null as string | null,
  },
  /** Only add verified, official accounts. */
  social: [] as { label: string; href: string }[],
} as const;
