import Link from 'next/link';
import type { Product } from '@/content/types';
import { faqs } from '@/content/faqs';
import { getProduct } from '@/content/products';
import { publishedIndustries } from '@/content/solutions';
import { PageHero } from './PageHero';
import { FaqSection } from './FaqSection';
import { FinalCta } from './FinalCta';
import { Section, SectionHeading } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ReviewMarker } from '@/components/ui/ReviewMarker';
import { ArrowIcon, ButtonLink } from '@/components/ui/Button';
import { HrmsPreview } from '@/components/previews/HrmsPreview';
import { ErpPreview } from '@/components/previews/ErpPreview';
import { JsonLd, softwareLd } from '@/components/layout/JsonLd';

/** Shared template for live product pages (HRMS, ERP). */
export function ProductPage({ product }: { product: Product }) {
  const other = getProduct(product.id === 'hrms' ? 'erp' : 'hrms');
  const Preview = product.id === 'hrms' ? HrmsPreview : ErpPreview;
  const topic = product.id === 'hrms' ? 'HRMS' : 'ERP';
  const productFaqs = faqs.filter((f) => f.topic === topic || f.topic === 'Pricing' || f.topic === 'Implementation');
  const industries = publishedIndustries().filter((i) => i.applications.some((a) => a.product === product.id));

  return (
    <>
      <PageHero
        crumbs={[{ name: 'Products', href: '/products' }, { name: product.shortName, href: product.href! }]}
        title={<>{product.name}</>}
        intro={
          <>
            <p>{product.purpose.description} <ReviewMarker verified={product.purpose.verified} /></p>
            <p className="mt-4"><StatusBadge status={product.availability} /></p>
          </>
        }
        aside={<div className="text-text-on-dark-muted"><Preview /></div>}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={`/book-demo?product=${product.id}`} size="lg">Book a {product.shortName} demo</ButtonLink>
          <ButtonLink href="/pricing" variant="secondary-dark" size="lg">Pricing</ButtonLink>
        </div>
      </PageHero>

      <Section labelledBy="cap-heading">
        <SectionHeading id="cap-heading" eyebrow="Capabilities" title={product.purpose.title} intro={`Who it is for: ${product.audiences.join(', ')}.`} />
        <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {product.capabilities.map((c) => (
            <div key={c.title} className="bg-surface p-6">
              <dt className="flex flex-wrap items-center gap-2 font-semibold">{c.title} <ReviewMarker verified={c.verified} /></dt>
              <dd className="mt-2 text-sm text-text-secondary">{c.description}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="muted" labelledBy="wf-heading">
        <SectionHeading id="wf-heading" eyebrow="Workflows" title="How work moves through it" intro="Typical workflows, shown step by step." />
        <div className="grid gap-6 lg:grid-cols-2">
          {product.workflows.map((w) => (
            <figure key={w.title} className="m-0 rounded-xl border border-border bg-surface p-6">
              <figcaption className="flex flex-wrap items-center gap-2 font-semibold">{w.title} <ReviewMarker verified={w.verified} /></figcaption>
              <ol className="mt-5 space-y-3">
                {w.steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-highlight text-xs font-semibold text-primary-on-highlight">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
              {w.note && <p className="mt-4 text-xs text-text-secondary">{w.note}</p>}
            </figure>
          ))}
        </div>
      </Section>

      <Section labelledBy="together-heading">
        <div className="grid gap-8 rounded-2xl border border-border p-8 md:grid-cols-[1.3fr_1fr] md:items-center md:p-10">
          <div>
            <h2 id="together-heading" className="text-display-sm font-semibold">Use {product.shortName} with {other.shortName}</h2>
            <p className="mt-3 text-text-secondary">
              Avyntro is modular. Start with {product.shortName} and add {other.shortName} on the same platform when you need it.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <ButtonLink href={other.href!} variant="secondary">Explore {other.shortName} <ArrowIcon /></ButtonLink>
            <ButtonLink href="/platform" variant="ghost">Platform overview</ButtonLink>
          </div>
        </div>
        {industries.length > 0 && (
          <p className="mt-8 text-sm text-text-secondary">
            Proposed use cases:{' '}
            {industries.map((i, idx) => (
              <span key={i.slug}>
                {idx > 0 && ', '}
                <Link href={`/solutions/industries/${i.slug}`} className="font-medium text-primary-strong hover:underline">{i.name}</Link>
              </span>
            ))}
          </p>
        )}
      </Section>

      <FaqSection items={productFaqs} tone="muted" title={`${product.shortName} questions`} />
      <FinalCta title={`See ${product.name} in a demo`} />
      <JsonLd data={softwareLd(product.name, product.seo?.description ?? product.tagline, product.href!)} />
    </>
  );
}
