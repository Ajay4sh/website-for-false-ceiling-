import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@/styles/globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { JsonLd, organizationLd, websiteLd } from '@/components/layout/JsonLd';
import { getMainNav } from '@/content/navigation';
import { site } from '@/content/site';
import { indexable, signInUrl, siteUrl } from '@/lib/env';

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: { default: `${site.name}: ${site.tagline} HRMS and ERP software`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  robots: indexable ? undefined : { index: false, follow: true },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0B1220',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-(--z-skip-link) rounded-md bg-surface px-4 py-2 font-semibold text-text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <Header nav={getMainNav()} signInUrl={signInUrl} />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer />
        <JsonLd data={organizationLd()} />
        <JsonLd data={websiteLd()} />
      </body>
    </html>
  );
}
