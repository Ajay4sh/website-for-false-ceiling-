import { PageHero } from '@/components/sections/PageHero';
import { FinalCta } from '@/components/sections/FinalCta';
import { IntegrationExplorer } from '@/components/interactive/IntegrationExplorer';
import { Section, SectionHeading } from '@/components/ui/Section';
import { ReviewMarker } from '@/components/ui/ReviewMarker';
import { ButtonLink } from '@/components/ui/Button';
import { integrationMethods, integrations, SEARCH_THRESHOLD } from '@/content/integrations';
import { contentReview } from '@/lib/env';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Integrations',
  description: 'Verified Avyntro integrations and integration options. Integrations are listed only once confirmed.',
  path: '/integrations',
});

export default function IntegrationsPage() {
  const available = integrations.filter((i) => i.status === 'available');
  const planned = integrations.filter((i) => i.status === 'planned');
  const methods = integrationMethods.filter((m) => m.status === 'on-request' || contentReview);
  return (
    <>
      <PageHero crumbs={[{ name: 'Integrations', href: '/integrations' }]} title="Integrations" intro="We list integrations only when they have been verified, so what you see here is what you can rely on." />
      <Section labelledBy="int-available">
        <SectionHeading id="int-available" eyebrow="Directory" title="Available integrations" />
        <IntegrationExplorer items={available} searchThreshold={SEARCH_THRESHOLD} />
      </Section>
      {planned.length > 0 && (
        <Section tone="muted" labelledBy="int-planned">
          <SectionHeading id="int-planned" eyebrow="Roadmap" title="Planned integrations" intro="Planned integrations are not available yet." />
          <IntegrationExplorer items={planned} searchThreshold={SEARCH_THRESHOLD} />
        </Section>
      )}
      <Section tone="muted" labelledBy="int-methods">
        <SectionHeading id="int-methods" eyebrow="Options" title="Ways to connect Avyntro" />
        <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {methods.map((m) => (
            <li key={m.title} className="bg-surface p-6">
              <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                {m.title}
                <ReviewMarker verified={m.status !== 'unconfirmed'} label="Unconfirmed" />
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{m.text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <ButtonLink href="/contact">Ask about a specific system</ButtonLink>
        </div>
      </Section>
      <FinalCta />
    </>
  );
}
