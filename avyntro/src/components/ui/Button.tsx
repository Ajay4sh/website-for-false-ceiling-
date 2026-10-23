import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'secondary-dark' | 'ghost-dark';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors duration-(--duration-base) ease-(--ease-standard) disabled:cursor-not-allowed disabled:opacity-60';
const variants: Record<Variant, string> = {
  primary: 'bg-primary-strong text-text-inverse hover:bg-primary-hover shadow-sm',
  secondary: 'bg-surface text-text-primary border border-border hover:border-text-secondary/40 hover:bg-background-light',
  ghost: 'text-primary-strong hover:bg-highlight hover:text-primary-on-highlight',
  'secondary-dark': 'bg-white/5 text-text-on-dark border border-border-dark hover:bg-white/10 hover:border-text-on-dark-muted/50',
  'ghost-dark': 'text-primary-soft hover:bg-white/5',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type LinkProps = { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, 'href' | 'className'>;

export function ButtonLink({ href, variant, size, className, children, ...rest }: LinkProps) {
  const external = /^https?:\/\//.test(href);
  if (external) {
    return (
      <a href={href} className={buttonClass(variant, size, className)} rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

type ButtonProps = { variant?: Variant; size?: Size } & ComponentProps<'button'>;
export function Button({ variant, size, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={className}>
      <path d="M3 8h9m-3.5-4L12 8l-3.5 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
