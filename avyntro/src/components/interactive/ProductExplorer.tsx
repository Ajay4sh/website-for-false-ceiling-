'use client';

import Link from 'next/link';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Product } from '@/content/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ReviewMarker } from '@/components/ui/ReviewMarker';
import { ArrowIcon, buttonClass } from '@/components/ui/Button';
import { HrmsPreview } from '@/components/previews/HrmsPreview';
import { ErpPreview } from '@/components/previews/ErpPreview';
import { cn } from '@/lib/cn';

const previews: Partial<Record<Product['id'], () => React.ReactNode>> = {
  hrms: () => <HrmsPreview />,
  erp: () => <ErpPreview />,
};

/**
 * Product explorer (WAI-ARIA tabs pattern): arrow keys move between tabs,
 * Home/End jump to the first/last, selection follows focus.
 */
export function ProductExplorer({ products }: { products: Product[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  const select = (i: number) => {
    const n = (i + products.length) % products.length;
    setActive(n);
    tabs.current[n]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => select(active + 1),
      ArrowDown: () => select(active + 1),
      ArrowLeft: () => select(active - 1),
      ArrowUp: () => select(active - 1),
      Home: () => select(0),
      End: () => select(products.length - 1),
    };
    const fn = keys[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="Avyntro products" className="inline-flex rounded-xl border border-border bg-background-light p-1" onKeyDown={onKeyDown}>
        {products.map((p, i) => (
          <button
            key={p.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${id}-tab-${p.id}`}
            aria-selected={i === active}
            aria-controls={`${id}-panel-${p.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:px-6',
              i === active ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {p.shortName}
            <StatusBadge status={p.availability} className="hidden sm:inline-flex" />
          </button>
        ))}
      </div>

      {products.map((p, i) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`${id}-panel-${p.id}`}
          aria-labelledby={`${id}-tab-${p.id}`}
          hidden={i !== active}
          tabIndex={0}
          className="mt-8 grid gap-10 rounded-sm lg:grid-cols-[1fr_1.1fr] lg:items-start"
        >
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-display-sm font-semibold">{p.name}</h3>
              <StatusBadge status={p.availability} />
            </div>
            <p className="mt-3 text-lg text-text-secondary">
              {p.purpose.description} <ReviewMarker verified={p.purpose.verified} />
            </p>

            <h4 className="mt-8 text-sm font-semibold">Capability areas</h4>
            <ul className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {p.capabilities.map((c) => (
                <li key={c.title} className="flex gap-3">
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="mt-1 shrink-0 text-secondary-strong">
                    <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>
                    <span className="font-medium">{c.title}</span> <ReviewMarker verified={c.verified} />
                    <span className="block text-sm text-text-secondary">{c.description}</span>
                  </span>
                </li>
              ))}
            </ul>

            {p.workflows[0] && (
              <>
                <h4 className="mt-8 text-sm font-semibold">
                  Typical workflow: {p.workflows[0].title} <ReviewMarker verified={p.workflows[0].verified} />
                </h4>
                <ol className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  {p.workflows[0].steps.map((s, si) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className="rounded-md border border-border bg-background-light px-2.5 py-1">{s}</span>
                      {si < p.workflows[0]!.steps.length - 1 && <ArrowIcon className="text-text-secondary" />}
                    </li>
                  ))}
                </ol>
              </>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/book-demo?product=${p.id}`} className={buttonClass('primary')}>
                Book a {p.shortName} demo
              </Link>
              {p.href && (
                <Link href={p.href} className={buttonClass('secondary')}>
                  View {p.shortName} <ArrowIcon />
                </Link>
              )}
            </div>
          </div>
          <div className="text-text-secondary">{previews[p.id]?.()}</div>
        </div>
      ))}
    </div>
  );
}
