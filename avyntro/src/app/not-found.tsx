import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';

export const metadata = { title: 'Page not found', robots: { index: false } };

const suggestions = [
  { href: '/products/hrms', label: 'HRMS' },
  { href: '/products/erp', label: 'ERP' },
  { href: '/platform', label: 'Platform overview' },
  { href: '/pricing', label: 'Pricing' },
];

export default function NotFound() {
  return (
    <section className="on-dark bg-background-dark text-text-on-dark">
      <div className="container-content py-24 md:py-32">
        <p className="font-mono text-sm text-secondary-soft">404</p>
        <h1 className="mt-3 text-display-lg font-semibold text-white">This page is not connected to anything</h1>
        <p className="mt-4 max-w-xl text-lg text-text-on-dark-muted">The page may have moved, or the link may be wrong. These are good places to start:</p>
        <ul className="mt-8 flex flex-wrap gap-3">
          {suggestions.map((s) => (
            <li key={s.href}><Link href={s.href} className="inline-block rounded-md border border-border-dark px-4 py-2 text-sm font-medium text-white hover:bg-white/5">{s.label}</Link></li>
          ))}
        </ul>
        <div className="mt-10"><ButtonLink href="/" size="lg">Back to the homepage</ButtonLink></div>
      </div>
    </section>
  );
}
