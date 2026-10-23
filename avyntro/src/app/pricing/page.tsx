import { PageHero } from '@/components/sections/PageHero';
import { FaqSection } from '@/components/sections/FaqSection';
import { FinalCta } from '@/components/sections/FinalCta';
import { Section, SectionHeading } from '@/components/ui/Section';
import { ReviewMarker } from '@/components/ui/ReviewMarker';
import { ButtonLink } from '@/components/ui/Button';
import { pricing } from '@/content/pricing';
import { faqs } from '@/content/faqs';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Pricing',
  description: 'Avyntro pricing is subscription-based and modular, with enterprise pricing for larger organisations. Book a demo for pricing tailored to your organisation.',
  path: '/pricing',
});

export default function PricingPage() {
  const demoLed = pricing.mode === 'demo-led';
  return (
    <>
      <PageHero
        crumbs={[{ name: 'Pricing', href: '/pricing' }]}
        title="Pricing"
        intro={demoLed ? 'Pricing depends on the products you choose and the size of your organisation. We share pricing during a demo or sales conversation.' : 'Choose the plan that fits your organisation.'}
      />
      <Section labelledBy="model-heading">
        <SectionHeading id="model-heading" eyebrow="How it works" title="Subscription-based and modular" />
        <ol className="grid gap-8 md:grid-cols-3">
          {pricing.model.map((m, i) => (
            <li key={m.title} className="border-t-2 border-primary-strong pt-5">
              <span className="font-mono text-sm text-secondary-strong">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{m.title}</h3>
              <p className="mt-2 text-text-secondary">{m.text}</p>
            </li>
          ))}
        </ol>
      </Section>
      <Section tone="muted" labelledBy="plans-heading">
        <SectionHeading id="plans-heading" eyebrow="Packages" title={<>Plans <ReviewMarker verified={pricing.verified} label="Provisional" /></>} intro="Plan names and audiences are indicative. Entitlements are confirmed in your proposal." />
        <ul className="grid gap-6 lg:grid-cols-3">
          {pricing.plans.map((p) => (
            <li key={p.id} className="flex flex-col rounded-2xl border border-border bg-surface p-8">
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <p className="mt-2 text-sm text-text-secondary">{p.for}</p>
              <p className="mt-6 text-display-sm font-semibold">{p.price ?? 'Pricing on request'}</p>
              {p.entitlements.length > 0 ? (
                <ul className="mt-6 space-y-2 text-sm">{p.entitlements.map((e) => <li key={e}>{e}</li>)}</ul>
              ) : (
                <p className="mt-6 text-sm text-text-secondary">Included products and limits are confirmed for your organisation during the sales process.</p>
              )}
              <div className="mt-auto pt-8">
                <ButtonLink href={p.id === 'enterprise' ? '/contact' : '/book-demo'} variant={p.id === 'growth' ? 'primary' : 'secondary'} className="w-full">
                  {p.id === 'enterprise' ? 'Contact sales' : 'Book a demo'}
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
        {pricing.currencyNote && <p className="mt-6 text-sm text-text-secondary">{pricing.currencyNote}</p>}
      </Section>
      <FaqSection items={faqs.filter((f) => f.topic === 'Pricing' || f.topic === 'Availability')} title="Pricing questions" />
      <FinalCta title="Get pricing for your organisation" text="Book a demo and we will recommend the right products and share pricing for your requirements." />
    </>
  );
}
