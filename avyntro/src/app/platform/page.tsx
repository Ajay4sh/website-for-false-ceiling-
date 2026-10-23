import { PageHero } from '@/components/sections/PageHero';
import { FinalCta } from '@/components/sections/FinalCta';
import { ConnectedWorkflows } from '@/components/sections/ConnectedWorkflows';
import { Trust } from '@/components/sections/Trust';
import { HeroPreview } from '@/components/previews/HeroPreview';
import { ProductExplorer } from '@/components/interactive/ProductExplorer';
import { Section, SectionHeading } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ArrowIcon, ButtonLink } from '@/components/ui/Button';
import { liveProducts, products } from '@/content/products';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Platform overview',
  description: 'Avyntro is a modular business management platform. HRMS and ERP are live today, with CRM and project management planned.',
  path: '/platform',
});

const principles = [
  { title: 'Modular', text: 'Start with the products you need now. Add more as your organisation grows.' },
  { title: 'Connected', text: 'Products are part of one platform rather than separate tools you have to stitch together.' },
  { title: 'Built to evolve', text: 'New capabilities are added to the same platform over time, starting with CRM and project management.' },
];

export default function PlatformPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: 'Platform', href: '/platform' }]}
        eyebrow="Business, Connected."
        title="One platform for people and operations"
        intro="Avyntro brings HR and business operations into a modular platform that can grow with your organisation."
        aside={<HeroPreview />}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/book-demo" size="lg">Book a demo</ButtonLink>
          <ButtonLink href="#explore" variant="secondary-dark" size="lg">Explore the products <ArrowIcon /></ButtonLink>
        </div>
      </PageHero>

      <Section labelledBy="principles-heading">
        <SectionHeading id="principles-heading" eyebrow="How it is built" title="A platform, not a collection of tools" />
        <ol className="grid gap-8 md:grid-cols-3">
          {principles.map((p, i) => (
            <li key={p.title} className="border-t-2 border-primary-strong pt-5">
              <span className="font-mono text-sm text-secondary-strong">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-text-secondary">{p.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="muted" labelledBy="roadmap-heading">
        <SectionHeading id="roadmap-heading" eyebrow="Product availability" title="What is live, and what is next" />
        <ol className="relative grid gap-4 md:grid-cols-5">
          {products.map((p) => (
            <li key={p.id} className={`rounded-xl border bg-surface p-5 ${p.availability === 'live' ? 'border-border' : 'border-dashed border-border'}`}>
              <StatusBadge status={p.availability} />
              <h3 className="mt-3 font-semibold">{p.shortName}</h3>
              <p className="mt-1 text-sm text-text-secondary">{p.tagline}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="explore-heading" id="explore">
        <SectionHeading id="explore-heading" eyebrow="Live products" title="Explore HRMS and ERP" />
        <ProductExplorer products={liveProducts()} />
      </Section>

      <Section tone="dark" labelledBy="flows-heading">
        <SectionHeading id="flows-heading" tone="dark" eyebrow="Connected workflows" title="How processes can connect across the platform" />
        <ConnectedWorkflows />
      </Section>

      <Trust />
      <FinalCta />
    </>
  );
}
