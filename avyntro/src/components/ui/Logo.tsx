import { cn } from '@/lib/cn';

/** Avyntro mark: two connected nodes forming an "A". Placeholder until a final logo is supplied. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8', className)}>
      <rect width="32" height="32" rx="8" fill="var(--color-primary-strong)" />
      <path d="M9 23 16 9l7 14" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 18h8" stroke="var(--color-secondary-soft)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="9" cy="23" r="2.4" fill="var(--color-secondary-soft)" />
      <circle cx="23" cy="23" r="2.4" fill="var(--color-secondary-soft)" />
    </svg>
  );
}

export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={cn('text-lg font-bold tracking-tight', dark ? 'text-white' : 'text-text-primary')}>Avyntro</span>
    </span>
  );
}
