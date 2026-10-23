import Link from 'next/link';
import { PageHero } from '@/components/sections/PageHero';
import { FinalCta } from '@/components/sections/FinalCta';
import { SolutionFinder } from '@/components/interactive/SolutionFinder';
import { Section, SectionHeading } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ArrowIcon } from '@/components/ui/Button';
import { getProduct } from '@/content/products';
import { needs, publishedIndustries } from '@/content/solutions';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Solutions',
  description: 'Find the Avyntro products that fit your business size, function and challenges, with proposed use cases for professional services, distribution and manufacturing.',
  path: '/solutions',
});

export default function SolutionsPage() {
  const industries = publishedIndustries();
  return (
    <>
      <PageHero crumbs={[{ name: 'Solutions', href: '/solutions' }]} title="Solutions by need and industry" intro="Start from the problem you are solving. We will show which Avyntro products are relevant, and which are still planned." />

      <Section labelledBy="finder-heading" id="finder">
        <SectionHeading id="finder-heading" eyebrow="Solution finder" title="Which products fit your organisation?" />
        <SolutionFinder />
      </Section>

      <Section tone="muted" labelledBy="needs-heading">
        <SectionHeading id="needs-heading" eyebrow="By business need" title="Common starting points" />
        <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2">
          {needs.map((n) => (
            <li key={n.title} className="bg-surface p-6 md:p-8">
              <h3 className="text-lg font-semibold">{n.title}</h3>
              <p className="mt-2 text-text-secondary">{n.text}</p>
              <ul className="mt-4 flex flex-wrap gap-3">
                {n.products.map((id) => {
                  const p = getProduct(id);
                  return (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      {p.href ? <Link href={p.href} className="font-semibold text-primary-strong hover:underline">{p.shortName}</Link> : <span className="font-semibold">{p.shortName}</span>}
                      <StatusBadge status={p.availability} />
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      {industries.length > 0 && (
        <Section labelledBy="ind-heading">
          <SectionHeading
            id="ind-heading"
            eyebrow="By industry"
            title="Proposed industry use cases"
            intro="How Avyntro's live products could apply to common needs in each sector. These are proposed use cases, not claims about existing customers."
          />
          <ul className="grid gap-6 md:grid-cols-3">
            {industries.map((i) => (
              <li key={i.slug}>
                <Link href={`/solutions/industries/${i.slug}`} className="group flex h-full flex-col rounded-xl border border-border p-6 transition-shadow hover:shadow-md">
                  <h3 className="text-lg font-semibold group-hover:text-primary-strong">{i.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-text-secondary">{i.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong">Read use case <ArrowIcon /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <FinalCta />
    </>
  );
}
