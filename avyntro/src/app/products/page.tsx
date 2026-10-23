import Link from 'next/link';
import { PageHero } from '@/components/sections/PageHero';
import { FinalCta } from '@/components/sections/FinalCta';
import { Section, SectionHeading } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ArrowIcon, ButtonLink } from '@/components/ui/Button';
import { liveProducts, upcomingProducts } from '@/content/products';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Products',
  description: 'Avyntro products: HRMS and ERP are live today. CRM and project management are planned. See what is available and what is coming.',
  path: '/products',
});

export default function ProductsPage() {
  return (
    <>
      <PageHero crumbs={[{ name: 'Products', href: '/products' }]} title="Products" intro="Avyntro is a modular platform. Here is what is available today and what is planned." />
      <Section labelledBy="live-heading">
        <SectionHeading id="live-heading" eyebrow="Available now" title="Live products" />
        <ul className="grid gap-6 md:grid-cols-2">
          {liveProducts().map((p) => (
            <li key={p.id} className="flex flex-col rounded-2xl border border-border p-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-display-sm font-semibold">{p.name}</h3>
                <StatusBadge status={p.availability} />
              </div>
              <p className="mt-2 font-medium text-secondary-strong">{p.tagline}</p>
              <ul className="mt-5 flex flex-wrap gap-2 text-sm">
                {p.capabilities.map((c) => <li key={c.title} className="rounded-md bg-background-light px-2.5 py-1 text-text-secondary">{c.title}</li>)}
              </ul>
              <div className="mt-auto flex flex-wrap gap-3 pt-8">
                <ButtonLink href={p.href!}>View {p.shortName} <ArrowIcon /></ButtonLink>
                <ButtonLink href={`/book-demo?product=${p.id}`} variant="secondary">Book a demo</ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      </Section>
      <Section tone="muted" labelledBy="upcoming-heading">
        <SectionHeading id="upcoming-heading" eyebrow="In the pipeline" title="Planned products" intro="These products are not available yet. Scope and timing have not been announced." />
        <ul className="grid gap-4 md:grid-cols-3">
          {upcomingProducts().map((p) => (
            <li key={p.id} className="rounded-xl border border-dashed border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{p.shortName}</h3>
                <StatusBadge status={p.availability} />
              </div>
              <p className="mt-2 text-sm text-text-secondary">{p.purpose.description}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm">
          Want to hear when a planned product becomes available?{' '}
          <Link href="/book-demo?intent=interest" className="font-semibold text-primary-strong hover:underline">Register your interest</Link>.
        </p>
      </Section>
      <FinalCta />
    </>
  );
}
