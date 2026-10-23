'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import {
  challengeOptions, companySizes, functions, recommend,
  type BusinessFunction, type Challenge, type CompanySize,
} from '@/lib/solution-finder';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { buttonClass } from '@/components/ui/Button';

/**
 * Solution finder. Recommendations come from deterministic rules in
 * lib/solution-finder.ts. Available and planned products are always shown
 * in separate lists.
 */
export function SolutionFinder() {
  const id = useId();
  const [size, setSize] = useState<CompanySize | ''>('');
  const [fn, setFn] = useState<BusinessFunction | ''>('');
  const [challenge, setChallenge] = useState<Challenge | ''>('');
  const complete = size && fn && challenge;
  const result = complete ? recommend({ size, fn, challenge }) : null;

  const select = 'mt-2 block h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary';

  return (
    <div className="grid gap-8 rounded-2xl border border-border bg-surface p-6 shadow-md md:p-8 lg:grid-cols-[1fr_1.15fr]">
      <form className="grid gap-5" onSubmit={(e) => e.preventDefault()} aria-describedby={`${id}-help`}>
        <p id={`${id}-help`} className="text-sm text-text-secondary">Answer three questions to see which Avyntro products are relevant.</p>
        <label className="text-sm font-medium">
          Business size
          <select className={select} value={size} onChange={(e) => setSize(e.target.value as CompanySize)}>
            <option value="">Select…</option>
            {companySizes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Department or function
          <select className={select} value={fn} onChange={(e) => setFn(e.target.value as BusinessFunction)}>
            <option value="">Select…</option>
            {functions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Main challenge
          <select className={select} value={challenge} onChange={(e) => setChallenge(e.target.value as Challenge)}>
            <option value="">Select…</option>
            {challengeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </form>

      <div aria-live="polite" className="rounded-xl bg-background-light p-6" data-testid="finder-result">
        {!result ? (
          <p className="text-sm text-text-secondary">Your recommendation will appear here.</p>
        ) : (
          <div>
            <h3 className="text-lg font-semibold">Recommended for you</h3>
            {result.available.length > 0 ? (
              <>
                <p className="mt-4 text-xs font-semibold tracking-wide text-text-secondary uppercase">Available now</p>
                <ul className="mt-2 grid gap-2">
                  {result.available.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
                      <span>
                        <Link href={p.href!} className="font-semibold text-primary-strong hover:underline">{p.name}</Link>
                        <span className="block text-sm text-text-secondary">{p.tagline}</span>
                      </span>
                      <StatusBadge status={p.availability} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3 text-sm">None of the live products match this need yet.</p>
            )}
            {result.planned.length > 0 && (
              <>
                <p className="mt-5 text-xs font-semibold tracking-wide text-text-secondary uppercase">Planned, not yet available</p>
                <ul className="mt-2 grid gap-2">
                  {result.planned.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3">
                      <span className="font-medium">{p.name}</span>
                      <StatusBadge status={p.availability} />
                    </li>
                  ))}
                </ul>
              </>
            )}
            {result.notes.length > 0 && (
              <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
                {result.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
            <Link href={result.cta.href} className={buttonClass('primary', 'md', 'mt-6')}>{result.cta.label}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
