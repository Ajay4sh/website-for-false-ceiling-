import type { ReactNode } from 'react';

/**
 * Accessible accordion using native <details>/<summary>: keyboard operable,
 * announced as expandable by screen readers, and works without JavaScript.
 */
export function AccordionItem({ title, children, defaultOpen }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group border-b border-border" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left text-base font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span aria-hidden="true" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border text-text-secondary transition-transform duration-(--duration-base) group-open:rotate-45">
          <svg viewBox="0 0 12 12" width="10" height="10"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </span>
      </summary>
      <div className="pb-6 pr-10 text-text-secondary">{children}</div>
    </details>
  );
}
