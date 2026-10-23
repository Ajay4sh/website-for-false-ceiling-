'use client';

import { useMemo, useState } from 'react';
import type { Integration } from '@/content/integrations';
import { cn } from '@/lib/cn';

/**
 * Integration directory. Search and category filters appear only when there
 * are enough verified entries to make them useful (no decorative search).
 */
export function IntegrationExplorer({ items, searchThreshold }: { items: Integration[]; searchThreshold: number }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((i) => i.category))).sort()], [items]);
  const showControls = items.length >= searchThreshold;

  const filtered = items.filter((i) => {
    const q = query.trim().toLowerCase();
    return (category === 'All' || i.category === category) && (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background-light p-8 text-center" data-testid="integrations-empty">
        <p className="font-semibold">No integrations are listed yet.</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-secondary">
          Integrations are published here only after they have been verified. If you depend on a particular system, contact us and we will confirm what is possible.
        </p>
      </div>
    );
  }

  return (
    <div>
      {showControls && (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="w-full sm:max-w-xs">
            <span className="sr-only">Search integrations</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search integrations" className="h-11 w-full rounded-md border border-border px-3 text-sm" />
          </label>
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}
                className={cn('rounded-pill border px-3 py-1.5 text-sm', category === c ? 'border-text-primary bg-text-primary text-white' : 'border-border hover:border-text-secondary')}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
      <p aria-live="polite" className="sr-only">{filtered.length} integrations shown</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((i) => (
          <li key={i.name} className="rounded-xl border border-border p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{i.name}</h3>
              <span className={cn('rounded-pill px-2 py-0.5 text-xs font-semibold', i.status === 'available' ? 'bg-status-live-bg text-status-live' : 'bg-status-planned-bg text-status-planned')}>
                {i.status === 'available' ? 'Available' : 'Planned'}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">{i.category} · {i.products.map((p) => p.toUpperCase()).join(', ')}</p>
            <p className="mt-3 text-sm text-text-secondary">{i.description}</p>
            {i.evidence && <a href={i.evidence} className="mt-3 inline-block text-sm font-medium text-primary-strong hover:underline" rel="noopener noreferrer">Documentation</a>}
          </li>
        ))}
      </ul>
      {filtered.length === 0 && <p className="text-sm text-text-secondary">No integrations match your search.</p>}
    </div>
  );
}
