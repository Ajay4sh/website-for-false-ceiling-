import { Suspense } from 'react';
import { PageHero } from '@/components/sections/PageHero';
import { DemoForm } from '@/components/interactive/DemoForm';
import { DemoFormFromQuery } from '@/components/interactive/DemoFormFromQuery';
import { Section } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { products } from '@/content/products';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Book a demo',
  description: 'Book a demo of Avyntro HRMS and ERP. Tell us about your organisation and our team will arrange a walkthrough.',
  path: '/book-demo',
});

const expect = [
  'We review your request and reply by email to arrange a time.',
  'The demo focuses on the processes you tell us about.',
  'You can ask about pricing, implementation, integrations and support.',
];

export default function BookDemoPage() {
  return (
    <>
      <PageHero crumbs={[{ name: 'Book a demo', href: '/book-demo' }]} title="Book a demo" intro="Tell us about your organisation and what you want to achieve. We will arrange a walkthrough of the relevant Avyntro products." />
      <Section labelledBy="form-heading">
        <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
          <div>
            <h2 id="form-heading" className="sr-only">Demo request form</h2>
            <Suspense fallback={<DemoForm intent="demo" />}>
              <DemoFormFromQuery />
            </Suspense>
          </div>
          <aside className="space-y-8 lg:border-l lg:border-border lg:pl-10">
            <div>
              <h2 className="font-semibold">What to expect</h2>
              <ol className="mt-4 space-y-3 text-sm text-text-secondary">
                {expect.map((e, i) => (
                  <li key={e} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-highlight text-xs font-semibold text-primary-on-highlight">{i + 1}</span>
                    {e}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h2 className="font-semibold">Product availability</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {products.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">{p.shortName}<StatusBadge status={p.availability} /></li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
