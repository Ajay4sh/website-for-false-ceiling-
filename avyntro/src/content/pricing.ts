/**
 * Pricing configuration.
 *
 * mode 'demo-led': no prices are shown; each plan leads to a demo/sales request.
 * mode 'published': plans with a `price` show it. Only switch when the
 * commercial model and entitlements are confirmed.
 */
export const pricing = {
  mode: 'demo-led' as 'demo-led' | 'published',
  currencyNote: null as string | null,
  /** Facts from the business brief: subscription-based, modular, enterprise pricing. */
  model: [
    { title: 'Subscription-based', text: 'Avyntro is offered as a subscription rather than a one-off licence.' },
    { title: 'Modular', text: 'Subscribe to the products your organisation needs, such as HRMS, ERP or both.' },
    { title: 'Enterprise pricing', text: 'Larger organisations can discuss pricing suited to their scale and requirements.' },
  ],
  plans: [
    {
      id: 'starter',
      name: 'Starter',
      for: 'Small businesses and startups getting started with structured systems.',
      price: null as string | null,
      entitlements: [] as string[],
    },
    {
      id: 'growth',
      name: 'Growth',
      for: 'SMEs and growing organisations coordinating more teams and processes.',
      price: null as string | null,
      entitlements: [] as string[],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      for: 'Mid-market and enterprise organisations with broader requirements.',
      price: null as string | null,
      entitlements: [] as string[],
    },
  ],
  /** Plan names and audiences are provisional until confirmed. */
  verified: false,
};
