import Link from 'next/link';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/ui/Section';
import { ButtonLink } from '@/components/ui/Button';
import { resources } from '@/content/misc';
import { pageMetadata } from '@/lib/seo';

// Not indexed while the directory is empty, so search engines never see a thin page.
export const metadata = pageMetadata({
  title: 'Resources',
  description: 'Guides and articles about Avyntro HRMS and ERP.',
  path: '/resources',
  noindex: resources.length === 0,
});

export default function ResourcesPage() {
  return (
    <>
      <PageHero crumbs={[{ name: 'Resources', href: '/resources' }]} title="Resources" intro="Guides, articles and documentation about Avyntro." />
      <Section labelledBy="res-heading">
        <h2 id="res-heading" className="sr-only">Resource directory</h2>
        {resources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background-light p-10 text-center">
            <p className="text-lg font-semibold">Resources are on the way.</p>
            <p className="mx-auto mt-2 max-w-lg text-text-secondary">We are preparing guides and product documentation. In the meantime, the best way to learn about Avyntro is a demo.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/book-demo">Book a demo</ButtonLink>
              <ButtonLink href="/platform" variant="secondary">Explore the platform</ButtonLink>
            </div>
          </div>
        ) : (
          <ul className="grid gap-6 md:grid-cols-3">
            {resources.map((r) => (
              <li key={r.href} className="rounded-xl border border-border p-6">
                <p className="text-xs font-semibold text-secondary-strong">{r.type}</p>
                <h3 className="mt-2 font-semibold"><Link href={r.href} className="hover:text-primary-strong">{r.title}</Link></h3>
                <p className="mt-2 text-sm text-text-secondary">{r.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
