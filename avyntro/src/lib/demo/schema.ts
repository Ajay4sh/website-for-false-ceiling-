import { z } from 'zod';

// No runtime code generation: avoids Zod's eval probe, which our CSP blocks.
z.config({ jitless: true });

/**
 * Demo / sales / interest request schema.
 * Shared by the browser (instant feedback) and the API route (authoritative).
 * Collects only what sales qualification needs.
 */
export const intents = ['demo', 'sales', 'interest'] as const;
export const companySizeValues = ['1-10', '11-50', '51-250', '251-1000', '1000+'] as const;
export const productInterestValues = ['hrms', 'erp', 'both', 'crm', 'project-management', 'not-sure'] as const;

export const productInterestLabels: Record<(typeof productInterestValues)[number], string> = {
  hrms: 'HRMS',
  erp: 'ERP',
  both: 'HRMS and ERP',
  crm: 'CRM (planned)',
  'project-management': 'Project management (planned)',
  'not-sure': 'Not sure yet',
};

export const LIMITS = {
  name: 100,
  company: 150,
  role: 100,
  requirements: 2000,
  phone: 30,
  /** Maximum accepted request body in bytes. */
  body: 8 * 1024,
  /** Minimum time a human takes to fill the form (ms). */
  minFillMs: 3000,
} as const;

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`).optional().transform((v) => (v ? v : undefined));

export const demoRequestSchema = z.object({
  intent: z.enum(intents).default('demo'),
  fullName: z.string().trim().min(2, 'Enter your full name.').max(LIMITS.name, `Name must be ${LIMITS.name} characters or fewer.`),
  email: z.string().trim().toLowerCase().max(254, 'Email is too long.').pipe(z.email('Enter a valid business email address.')),
  company: z.string().trim().min(2, 'Enter your company name.').max(LIMITS.company, `Company must be ${LIMITS.company} characters or fewer.`),
  role: optionalText(LIMITS.role, 'Job role'),
  companySize: z.enum(companySizeValues, { error: 'Select your company size.' }),
  product: z.enum(productInterestValues, { error: 'Select the product you are interested in.' }),
  requirements: optionalText(LIMITS.requirements, 'Requirements'),
  phone: z
    .string()
    .trim()
    .max(LIMITS.phone, 'Phone number is too long.')
    .regex(/^$|^\+?[0-9 ()-]{7,}$/, 'Enter a valid phone number, or leave it empty.')
    .optional()
    .transform((v) => (v ? v : undefined)),
  consent: z.literal(true, { error: 'Please confirm you agree to be contacted about this request.' }),
});

/** Anti-spam fields, validated separately so they never reach delivery. */
export const spamFieldsSchema = z.object({
  /** Honeypot: hidden from people; must stay empty. */
  website: z.string().max(200).optional(),
  /** Epoch ms when the form was rendered. */
  startedAt: z.number().int().positive().optional(),
});

export type DemoRequest = z.infer<typeof demoRequestSchema>;
export type DemoRequestInput = z.input<typeof demoRequestSchema>;

/** Flatten zod issues to { field: firstMessage }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
