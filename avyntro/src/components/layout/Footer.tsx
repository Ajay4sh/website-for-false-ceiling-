import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { products, availabilityLabel } from '@/content/products';
import { site } from '@/content/site';
import { publishedIndustries } from '@/content/solutions';

export function Footer() {
  const year = new Date().getFullYear();
  const { contact } = site;
  const hasContact = Object.values(contact).some(Boolean);
  return (
    <footer className="on-dark border-t border-border-dark bg-background-dark text-text-on-dark-muted">
      <div className="container-content grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="max-w-xs">
          <Link href="/" aria-label="Avyntro home" className="inline-block rounded-md">
            <Logo dark />
          </Link>
          <p className="mt-4 text-sm">{site.tagline} A modular platform for HR and business operations.</p>
          {hasContact && (
            <address className="mt-4 space-y-1 text-sm not-italic">
              {contact.salesEmail && <p><a className="hover:text-white" href={`mailto:${contact.salesEmail}`}>{contact.salesEmail}</a></p>}
              {contact.phone && <p><a className="hover:text-white" href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a></p>}
              {contact.address && <p>{contact.address}</p>}
            </address>
          )}
        </div>
        <FooterCol title="Products">
          {products.map((p) => (
            <li key={p.id}>
              {p.href ? (
                <Link className="hover:text-white" href={p.href}>{p.shortName}</Link>
              ) : (
                <span>
                  {p.shortName} <span className="text-xs">({availabilityLabel[p.availability]})</span>
                </span>
              )}
            </li>
          ))}
        </FooterCol>
        <FooterCol title="Platform">
          <li><Link className="hover:text-white" href="/platform">Platform overview</Link></li>
          <li><Link className="hover:text-white" href="/products">All products</Link></li>
          <li><Link className="hover:text-white" href="/integrations">Integrations</Link></li>
          <li><Link className="hover:text-white" href="/pricing">Pricing</Link></li>
        </FooterCol>
        <FooterCol title="Solutions">
          <li><Link className="hover:text-white" href="/solutions">Solutions overview</Link></li>
          {publishedIndustries().map((i) => (
            <li key={i.slug}><Link className="hover:text-white" href={`/solutions/industries/${i.slug}`}>{i.name}</Link></li>
          ))}
        </FooterCol>
        <FooterCol title="Company">
          <li><Link className="hover:text-white" href="/about">About</Link></li>
          <li><Link className="hover:text-white" href="/resources">Resources</Link></li>
          <li><Link className="hover:text-white" href="/contact">Contact sales</Link></li>
          <li><Link className="hover:text-white" href="/book-demo">Book a demo</Link></li>
        </FooterCol>
      </div>
      <div className="border-t border-border-dark">
        <div className="container-content flex flex-col gap-3 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.company.legalName ?? site.name}. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><Link className="hover:text-white" href="/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-white" href="/terms">Terms of service</Link></li>
            {site.social.map((s) => (
              <li key={s.href}><a className="hover:text-white" href={s.href} rel="noopener noreferrer">{s.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}
