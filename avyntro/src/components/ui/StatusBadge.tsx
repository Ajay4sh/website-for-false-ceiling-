import type { Availability } from '@/content/types';
import { availabilityLabel } from '@/content/products';
import { cn } from '@/lib/cn';

const styles: Record<Availability, string> = {
  live: 'bg-status-live-bg text-status-live',
  planned: 'bg-status-planned-bg text-status-planned',
  tba: 'bg-status-tba-bg text-status-tba',
};

/** Availability label. Driven only by content data, never hard-coded per product. */
export function StatusBadge({ status, className }: { status: Availability; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-semibold', styles[status], className)}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', status === 'live' ? 'bg-status-live' : status === 'planned' ? 'bg-status-planned' : 'bg-status-tba')} />
      {availabilityLabel[status]}
    </span>
  );
}
