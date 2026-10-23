import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/sections/PageHero';
import { FinalCta } from '@/components/sections/FinalCta';
import { Section, SectionHeading } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ReviewMarker, DraftBanner } from '@/components/ui/ReviewMarker';
import { ArrowIcon, ButtonLink } from '@/components/ui/Button';
import { getProduct } from '@/content/products';
import { publishedIndustries } from '@/content/solutions';
import { pageMetadata } from '@/lib/seo';

// Only published industries with their own content are generated; anything else is a 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return publishedIndustries().map((i) => ({ industry: i.slug }));
}

type Props = { params: Promise<{ industry: string }> };
const find = (slug: string) => publishedIndustries().find((i) => i.slug === slug);

export async function generateMetadata({ params }: Props) {
  const { industry } = await params;
  const i = find(industry);
  if (!i) return {};
  return pageMetadata({ title: `${i.name}: proposed use case`, description: i.summary, path: `/solutions/industries/${i.slug}` });
}

export default async function IndustryPage({ params }: Props) {
  const { industry } = await params;
  const i = find(industry);
  if (!i) notFound();
  return (
    <>
      <PageHero
        crumbs={[{ name: 'Solutions', href: '/solutions' }, { name: i.name, href: `/solutions/industries/${i.slug}` }]}
        eyebrow="Proposed use case"
        title={i.name}
        intro={i.summary}
      />
      <Section labelledBy="ind-ch">
        <div className="mb-10 max-w-(--container-prose)">
          <DraftBanner>
            This page describes how Avyntro&apos;s live products could support common needs in {i.name.toLowerCase()}. It is not a claim of existing customers or proven specialisation.
          </DraftBanner>
        </div>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="ind-ch" title="Common challenges" className="mb-6" />
            <ul className="space-y-4">
              {i.challenges.map((c) => (
                <li key={c} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-secondary-strong" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-6 flex flex-wrap items-center gap-3 text-display-md font-semibold">How Avyntro could help <ReviewMarker verified={i.verified} /></h2>
            <ul className="space-y-4">
              {i.applications.map((a) => {
                const p = getProduct(a.product);
                return (
                  <li key={a.product} className="rounded-xl border border-border p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={p.href!} className="font-semibold text-primary-strong hover:underline">{p.name}</Link>
                      <StatusBadge status={p.availability} />
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">{a.text}</p>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/book-demo">Book a demo</ButtonLink>
              <ButtonLink href="/solutions" variant="secondary">All solutions <ArrowIcon /></ButtonLink>
            </div>
          </div>
        </div>
      </Section>
      <FinalCta />
    </>
  );
}
