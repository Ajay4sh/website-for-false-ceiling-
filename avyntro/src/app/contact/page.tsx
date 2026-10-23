import { Suspense } from 'react';
import Link from 'next/link';
import { PageHero } from '@/components/sections/PageHero';
import { DemoForm } from '@/components/interactive/DemoForm';
import { DemoFormFromQuery } from '@/components/interactive/DemoFormFromQuery';
import { Section } from '@/components/ui/Section';
import { site } from '@/content/site';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Contact sales',
  description: 'Contact the Avyntro sales team about HRMS, ERP, enterprise pricing or upcoming products.',
  path: '/contact',
});

export default function ContactPage() {
  const { contact } = site;
  const details = [
    contact.salesEmail && { label: 'Sales', value: contact.salesEmail, href: `mailto:${contact.salesEmail}` },
    contact.supportEmail && { label: 'Support', value: contact.supportEmail, href: `mailto:${contact.supportEmail}` },
    contact.phone && { label: 'Phone', value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` },
  ].filter(Boolean) as { label: string; value: string; href: string }[];
  return (
    <>
      <PageHero crumbs={[{ name: 'Contact', href: '/contact' }]} title="Contact sales" intro="Questions about products, enterprise pricing or integrations? Send us a message and the team will reply by email." />
      <Section labelledBy="contact-form-heading">
        <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
          <div>
            <h2 id="contact-form-heading" className="sr-only">Contact form</h2>
            <Suspense fallback={<DemoForm intent="sales" />}>
              <DemoFormFromQuery fallbackIntent="sales" />
            </Suspense>
          </div>
          <aside className="space-y-8 lg:border-l lg:border-border lg:pl-10">
            {details.length > 0 && (
              <div>
                <h2 className="font-semibold">Contact details</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  {details.map((d) => (
                    <div key={d.label}><dt className="text-text-secondary">{d.label}</dt><dd><a href={d.href} className="font-medium text-primary-strong hover:underline">{d.value}</a></dd></div>
                  ))}
                </dl>
                {contact.address && <address className="mt-4 text-sm not-italic text-text-secondary">{contact.address}</address>}
              </div>
            )}
            <div>
              <h2 className="font-semibold">Prefer a walkthrough?</h2>
              <p className="mt-2 text-sm text-text-secondary">If you would like to see the products, <Link href="/book-demo" className="font-medium text-primary-strong hover:underline">book a demo</Link> instead.</p>
            </div>
            <div>
              <h2 className="font-semibold">Interested in CRM or project management?</h2>
              <p className="mt-2 text-sm text-text-secondary">These products are planned. <Link href="/book-demo?intent=interest" className="font-medium text-primary-strong hover:underline">Register your interest</Link>.</p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
