import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

/** Dark header band for inner pages. Kept compact so content stays above the fold. */
export function PageHero({
  eyebrow, title, intro, crumbs, children, aside,
}: { eyebrow?: string; title: ReactNode; intro?: ReactNode; crumbs?: { name: string; href: string }[]; children?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="on-dark relative overflow-hidden bg-background-dark text-text-on-dark">
      <div aria-hidden="true" className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
      <div className={`container-content relative py-14 md:py-20 ${aside ? 'grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center' : ''}`}>
        <div className="max-w-(--container-prose)">
          {crumbs && <Breadcrumbs items={crumbs} />}
          {eyebrow && <p className="eyebrow mb-3 text-secondary-soft">{eyebrow}</p>}
          <h1 className="text-display-lg font-semibold text-white">{title}</h1>
          {intro && <div className="mt-5 text-lg text-text-on-dark-muted">{intro}</div>}
          {children}
        </div>
        {aside && <div>{aside}</div>}
      </div>
    </section>
  );
}
