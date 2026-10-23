import { contentReview } from '@/lib/env';
import { cn } from '@/lib/cn';

/**
 * Visible marker on content that has not been verified yet.
 * Renders only while NEXT_PUBLIC_CONTENT_REVIEW is not "false".
 */
export function ReviewMarker({ verified, className, label = 'Needs verification' }: { verified: boolean; className?: string; label?: string }) {
  if (verified || !contentReview) return null;
  return (
    <span
      className={cn('inline-flex shrink-0 items-center rounded-sm bg-review-bg px-1.5 py-0.5 align-middle text-[0.6875rem] font-semibold tracking-wide text-review uppercase', className)}
      title="This content is a draft and must be verified before launch."
    >
      {label}
    </span>
  );
}

/** Page-level banner for draft pages (e.g. legal placeholders). */
export function DraftBanner({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="rounded-lg border border-review/20 bg-review-bg px-4 py-3 text-sm text-review">
      {children}
    </div>
  );
}
