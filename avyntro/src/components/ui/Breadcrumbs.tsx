import Link from 'next/link';
import { JsonLd, breadcrumbLd } from '@/components/layout/JsonLd';

export function Breadcrumbs({ items, tone = 'dark' }: { items: { name: string; href: string }[]; tone?: 'dark' | 'light' }) {
  const all = [{ name: 'Home', href: '/' }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          {all.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true" className={tone === 'dark' ? 'text-text-on-dark-muted' : 'text-text-secondary'}>/</span>}
              {i === all.length - 1 ? (
                <span aria-current="page" className={tone === 'dark' ? 'text-text-on-dark' : 'text-text-primary'}>{c.name}</span>
              ) : (
                <Link href={c.href} className={tone === 'dark' ? 'text-text-on-dark-muted hover:text-white' : 'text-text-secondary hover:text-text-primary'}>{c.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(all)} />
    </>
  );
}
