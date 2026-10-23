import Link from 'next/link';
import { ArrowIcon, ButtonLink } from '@/components/ui/Button';
import { Section, SectionHeading } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HeroPreview } from '@/components/previews/HeroPreview';
import { ProductExplorer } from '@/components/interactive/ProductExplorer';
import { SolutionFinder } from '@/components/interactive/SolutionFinder';
import { ConnectedWorkflows } from '@/components/sections/ConnectedWorkflows';
import { Trust } from '@/components/sections/Trust';
import { FaqSection } from '@/components/sections/FaqSection';
import { FinalCta } from '@/components/sections/FinalCta';
import { liveProducts, products } from '@/content/products';
import { challenges } from '@/content/misc';
import { faqs } from '@/content/faqs';
import { pricing } from '@/content/pricing';
import { integrations } from '@/content/integrations';
import { publishedIndustries } from '@/content/solutions';
import { site } from '@/content/site';
import { pageMetadata } from '@/lib/seo';

export const metadata = {
  ...pageMetadata({
    title: `${site.name}: HRMS and ERP software for connected business operations`,
    description: "Manage people, processes and business operations with Avyntro's integrated HRMS and ERP. Modular business software for SMEs, mid-market and enterprise. Book a demo.",
    path: '/',
  }),
  title: { absolute: `${site.name} | ${site.tagline} HRMS and ERP software` },
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="on-dark relative overflow-hidden bg-background-dark text-text-on-dark">
        <div aria-hidden="true" className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_20%,black,transparent_70%)]" />
        <div aria-hidden="true" className="absolute -right-40 -top-40 size-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(59_130_246/0.18),transparent)]" />
        <div className="container-content relative grid gap-12 pb-16 pt-12 md:pt-16 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16 lg:pb-24">
          <div>
            <p className="eyebrow inline-flex items-center gap-2 text-secondary-soft">
              <span className="size-1.5 rounded-full bg-secondary-soft" aria-hidden="true" />
              {site.tagline}
            </p>
            <h1 id="hero-heading" className="mt-4 text-display-lg font-semibold text-white">{site.hero.headline}</h1>
            <p className="mt-5 max-w-xl text-lg text-text-on-dark-muted">{site.hero.subheadline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/book-demo" size="lg">Book a demo</ButtonLink>
              <ButtonLink href="/platform" variant="secondary-dark" size="lg">Explore the platform <ArrowIcon /></ButtonLink>
            </div>
            <p className="mt-6 text-sm text-text-on-dark-muted">For small businesses, SMEs, mid-market organisations and enterprises.</p>
          </div>
          <HeroPreview />
        </div>
      </section>

      {/* Product availability */}
      <section aria-labelledby="availability-heading" className="border-b border-border bg-surface">
        <div className="container-content py-8">
          <h2 id="availability-heading" className="sr-only">Product availability</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                {p.href ? (
                  <Link href={p.href} className="font-semibold text-text-primary hover:text-primary-strong">{p.shortName}</Link>
                ) : (
                  <span className="font-semibold text-text-secondary">{p.shortName}</span>
                )}
                <StatusBadge status={p.availability} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Business challenges */}
      <Section labelledBy="challenges-heading">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            id="challenges-heading"
            eyebrow="The problem"
            title="Business runs on connected work. The software often is not."
            intro="As organisations grow, processes spread across tools, inboxes and spreadsheets. The cost shows up as rework, delay and guesswork."
            className="mb-0"
          />
          <ol className="divide-y divide-border border-y border-border">
            {challenges.map((c, i) => (
              <li key={c.title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-6">
                <span className="font-mono text-sm font-semibold text-secondary-strong">0{i + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold">{c.title}</h3>
                  <p className="mt-1.5 text-text-secondary">{c.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Product explorer */}
      <Section tone="muted" labelledBy="explorer-heading" id="products">
        <SectionHeading
          id="explorer-heading"
          eyebrow="Products"
          title="Two live products. One platform."
          intro="Start with the product you need. Switch between HRMS and ERP to see what each one is for."
        />
        <ProductExplorer products={liveProducts()} />
      </Section>

      {/* Connected workflows */}
      <Section tone="dark" labelledBy="workflows-heading">
        <SectionHeading
          id="workflows-heading"
          tone="dark"
          eyebrow="Connected workflows"
          title="Processes that move from one step to the next"
          intro="Avyntro is built as a modular platform, so work can flow across products as the platform grows. These examples show what that looks like."
        />
        <ConnectedWorkflows />
      </Section>

      {/* Solutions */}
      <Section labelledBy="solutions-heading" id="solution-finder">
        <SectionHeading
          id="solutions-heading"
          eyebrow="Solutions"
          title="Find what fits your organisation"
          intro="Tell us a little about your business and we will point you to the relevant products."
        />
        <SolutionFinder />
        {publishedIndustries().length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <span className="font-semibold">Proposed use cases by industry:</span>
            {publishedIndustries().map((i) => (
              <Link key={i.slug} href={`/solutions/industries/${i.slug}`} className="font-medium text-primary-strong hover:underline">{i.name}</Link>
            ))}
          </div>
        )}
      </Section>

      {/* Integrations */}
      <Section tone="muted" labelledBy="integrations-heading">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            id="integrations-heading"
            eyebrow="Integrations"
            title="Integrations, listed only when verified"
            intro={
              integrations.length
                ? 'See which systems Avyntro connects with today, and which are planned.'
                : 'We do not list integrations until they are confirmed. Tell us which systems you rely on and we will confirm what is possible.'
            }
            className="mb-0"
          />
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <ButtonLink href="/integrations" variant="secondary">View integrations <ArrowIcon /></ButtonLink>
            <ButtonLink href="/contact">Ask about a system</ButtonLink>
          </div>
        </div>
      </Section>

      <Trust />

      {/* Pricing */}
      <Section labelledBy="pricing-heading">
        <SectionHeading id="pricing-heading" eyebrow="Pricing" title="Subscriptions that match what you use" intro="Avyntro is subscription-based and modular, with enterprise pricing for larger organisations." />
        <ul className="grid gap-4 md:grid-cols-3">
          {pricing.plans.map((p) => (
            <li key={p.id} className="rounded-xl border border-border p-6">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mt-2 text-sm text-text-secondary">{p.for}</p>
              <p className="mt-4 text-sm font-medium">{p.price ?? 'Pricing on request'}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <ButtonLink href="/pricing" variant="secondary">How pricing works <ArrowIcon /></ButtonLink>
        </div>
      </Section>

      <FaqSection items={faqs} tone="muted" />
      <FinalCta />
    </>
  );
}
