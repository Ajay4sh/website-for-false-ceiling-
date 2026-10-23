import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Window chrome for illustrative product previews.
 * The caption is always rendered: these are drawings with fictional sample
 * data, not screenshots of the live application.
 */
export function PreviewFrame({ title, children, className, caption = true }: { title: string; children: ReactNode; className?: string; caption?: boolean }) {
  return (
    <figure className={cn('m-0', className)}>
      <div className="overflow-hidden rounded-xl bg-surface text-text-primary shadow-(--shadow-window)" role="img" aria-label={`Illustrative preview of ${title} with fictional sample data`}>
        <div className="flex items-center gap-2 border-b border-border bg-background-light px-4 py-2.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-3 truncate text-xs font-medium text-text-secondary">{title}</span>
        </div>
        <div aria-hidden="true">{children}</div>
      </div>
      {caption && (
        <figcaption className="mt-3 text-xs text-current">
          Illustrative preview with fictional sample data. Not a screenshot of the live product.
        </figcaption>
      )}
    </figure>
  );
}

export function Pill({ tone, children }: { tone: 'green' | 'amber' | 'blue' | 'slate'; children: ReactNode }) {
  const t = {
    green: 'bg-status-live-bg text-status-live',
    amber: 'bg-status-planned-bg text-status-planned',
    blue: 'bg-highlight text-primary-on-highlight',
    slate: 'bg-status-tba-bg text-status-tba',
  }[tone];
  return <span className={cn('rounded-pill px-2 py-0.5 text-[0.6875rem] font-semibold', t)}>{children}</span>;
}

export function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[0.6875rem] text-text-secondary">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {note && <p className="text-[0.6875rem] text-text-secondary">{note}</p>}
    </div>
  );
}
