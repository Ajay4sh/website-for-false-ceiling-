'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { NavGroup } from '@/content/navigation';
import { Logo } from '@/components/ui/Logo';
import { buttonClass } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * Site header.
 * Note: no backdrop-filter on the header. It would create a containing block
 * and trap the position:fixed mobile panel inside the 64px header.
 * Desktop: disclosure-pattern dropdowns (button + aria-expanded), closed by
 * Escape, outside click or focus leaving. Mobile: a full-height menu panel
 * with nested disclosures; focus moves into it and returns to the toggle.
 */
export function Header({ nav, signInUrl }: { nav: NavGroup[]; signInUrl: string | null }) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const closeAll = useCallback(() => {
    setOpenMenu(null);
  }, []);

  // Close menus on route change (adjusting state during render, per React docs).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenMenu(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mobileOpen) {
        setMobileOpen(false);
        toggleRef.current?.focus();
      } else if (openMenu) {
        const btn = document.getElementById(`${baseId}-${openMenu}-btn`);
        setOpenMenu(null);
        btn?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) closeAll();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [openMenu, mobileOpen, closeAll, baseId]);

  // Lock scroll and move focus into the mobile panel while it is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    if (mobileOpen) panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));

  return (
    <header className="on-dark sticky top-0 z-(--z-header) border-b border-border-dark bg-background-dark">
      <div className="container-content flex h-(--header-height) items-center justify-between gap-6">
        <Link href="/" aria-label="Avyntro home" className="rounded-md">
          <Logo dark />
        </Link>

        {/* Desktop navigation */}
        <nav ref={navRef} aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((g) => {
              const id = `${baseId}-${g.label}`;
              const expanded = openMenu === g.label;
              return (
                <li
                  key={g.label}
                  className="relative"
                  onBlur={(e) => {
                    if (g.children && !e.currentTarget.contains(e.relatedTarget as Node)) setOpenMenu((m) => (m === g.label ? null : m));
                  }}
                >
                  {g.children ? (
                    <>
                      <button
                        id={`${id}-btn`}
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`${id}-menu`}
                        onClick={() => setOpenMenu(expanded ? null : g.label)}
                        className={cn(
                          'flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          expanded || isActive(g.href) ? 'text-white' : 'text-text-on-dark-muted hover:text-white',
                        )}
                      >
                        {g.label}
                        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className={cn('transition-transform', expanded && 'rotate-180')}>
                          <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <div
                        id={`${id}-menu`}
                        hidden={!expanded}
                        className="absolute left-0 top-full z-(--z-dropdown) mt-2 w-80 rounded-xl border border-border bg-surface p-2 text-text-primary shadow-lg"
                      >
                        <ul>
                          {g.children.map((c) => (
                            <li key={c.href}>
                              <Link
                                href={c.href}
                                aria-current={pathname === c.href ? 'page' : undefined}
                                className="block rounded-lg px-3 py-2.5 hover:bg-background-light focus-visible:bg-background-light"
                              >
                                <span className="block text-sm font-semibold">{c.label}</span>
                                {c.description && <span className="mt-0.5 block text-xs text-text-secondary">{c.description}</span>}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <Link
                      href={g.href}
                      aria-current={isActive(g.href) ? 'page' : undefined}
                      className={cn('block rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive(g.href) ? 'text-white' : 'text-text-on-dark-muted hover:text-white')}
                    >
                      {g.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {signInUrl && (
            <a href={signInUrl} className="rounded-md px-3 py-2 text-sm font-medium text-text-on-dark-muted hover:text-white" rel="noopener noreferrer">
              Sign in
            </a>
          )}
          <Link href="/book-demo" className={buttonClass('primary', 'sm')}>
            Book a demo
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          ref={toggleRef}
          type="button"
          className="grid size-11 place-items-center rounded-md text-white lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls={`${baseId}-mobile`}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            {mobileOpen ? (
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile panel */}
      <div
        id={`${baseId}-mobile`}
        ref={panelRef}
        hidden={!mobileOpen}
        className="fixed inset-x-0 bottom-0 top-(--header-height) z-(--z-overlay) overflow-y-auto border-t border-border-dark bg-background-dark lg:hidden"
      >
        <nav aria-label="Mobile" className="container-content py-4">
          <ul className="divide-y divide-border-dark">
            {nav.map((g) => (
              <li key={g.label}>
                {g.children ? (
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-base font-medium text-white [&::-webkit-details-marker]:hidden">
                      {g.label}
                      <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true" className="text-text-on-dark-muted transition-transform group-open:rotate-180">
                        <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </summary>
                    <ul className="pb-3">
                      {g.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-2.5 text-sm text-text-on-dark hover:bg-white/5">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <Link href={g.href} onClick={() => setMobileOpen(false)} className="block py-4 text-base font-medium text-white">
                    {g.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-3">
            <Link href="/book-demo" onClick={() => setMobileOpen(false)} className={buttonClass('primary', 'lg')}>
              Book a demo
            </Link>
            {signInUrl && (
              <a href={signInUrl} className={buttonClass('secondary-dark', 'lg')} rel="noopener noreferrer">
                Sign in
              </a>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
