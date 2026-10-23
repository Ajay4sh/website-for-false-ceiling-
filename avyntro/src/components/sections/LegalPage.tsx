import type { ReactNode } from 'react';
import { PageHero } from './PageHero';
import { Section } from '@/components/ui/Section';
import { DraftBanner } from '@/components/ui/ReviewMarker';

/** Layout for legal placeholder pages. Text must be replaced after legal review. */
export function LegalPage({ title, path, children }: { title: string; path: string; children: ReactNode }) {
  return (
    <>
      <PageHero crumbs={[{ name: title, href: path }]} title={title} />
      <Section labelledBy="legal-body">
        <div className="max-w-(--container-prose)">
          <DraftBanner>
            <strong>Draft for legal review.</strong> This page is a placeholder structure and is not a legally reviewed document. It must be completed and approved before launch.
          </DraftBanner>
          <div id="legal-body" className="mt-10 space-y-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-text-secondary [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-text-secondary">
            {children}
          </div>
        </div>
      </Section>
    </>
  );
}
