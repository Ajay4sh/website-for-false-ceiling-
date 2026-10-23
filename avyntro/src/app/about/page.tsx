import { PageHero } from '@/components/sections/PageHero';
import { FinalCta } from '@/components/sections/FinalCta';
import { Section, SectionHeading } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ReviewMarker } from '@/components/ui/ReviewMarker';
import { products } from '@/content/products';
import { site } from '@/content/site';
import { contentReview } from '@/lib/env';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'About Avyntro',
  description: 'Avyntro builds modular business management software, starting with HRMS and ERP. Business, Connected.',
  path: '/about',
});

export default function AboutPage() {
  const facts = [
    ['Legal name', site.company.legalName],
    ['Founded', site.company.founded],
    ['Headquarters', site.company.headquarters],
  ].filter(([, v]) => v) as [string, string][];
  return (
    <>
      <PageHero crumbs={[{ name: 'About', href: '/about' }]} eyebrow={site.tagline} title="About Avyntro" intro="We build modular business management software that helps organisations coordinate people and processes through connected systems." />
      <Section labelledBy="mission-heading">
        <div className="grid gap-12 lg:grid-cols-2">
          <SectionHeading id="mission-heading" eyebrow="What we do" title="Software that keeps the business connected" className="mb-0" />
          <div className="space-y-4 text-lg text-text-secondary">
            <p>Most organisations run on a patchwork of tools. Information is re-keyed, processes depend on email, and nobody is quite sure which spreadsheet is current.</p>
            <p>Avyntro is a modular platform designed to reduce that fragmentation. HRMS and ERP are live today, with CRM and project management planned, so organisations can start with what they need and grow on the same platform.</p>
          </div>
        </div>
      </Section>
      <Section tone="muted" labelledBy="products-heading">
        <SectionHeading id="products-heading" eyebrow="Products" title="Where we are today" />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <span className="font-medium">{p.shortName}</span>
              <StatusBadge status={p.availability} />
            </li>
          ))}
        </ul>
      </Section>
      {(facts.length > 0 || contentReview) && (
        <Section labelledBy="facts-heading">
          <SectionHeading id="facts-heading" eyebrow="Company" title="Company information" />
          {facts.length > 0 ? (
            <dl className="grid gap-6 sm:grid-cols-3">
              {facts.map(([k, v]) => (
                <div key={k}><dt className="text-sm text-text-secondary">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>
              ))}
            </dl>
          ) : (
            <p className="text-text-secondary"><ReviewMarker verified={false} label="Placeholder" /> Company details (legal name, founding year, headquarters, team) to be supplied.</p>
          )}
        </Section>
      )}
      <FinalCta />
    </>
  );
}
