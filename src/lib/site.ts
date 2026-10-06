import settings from '../data/settings.json';

export { settings };

export const phoneHref = `tel:${settings.phone.replace(/[^\d+]/g, '')}`;
export const mailHref = `mailto:${settings.email}`;

export function waHref(text = `Hi ${settings.businessName}, I'd like a quote for a false ceiling.`) {
  const num = settings.whatsapp.replace(/\D/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

/** Absolute URL for a path, used in SEO tags and structured data. */
export function absUrl(path: string, site?: URL) {
  return new URL(path, site ?? settings.siteUrl).href;
}

export function formatINR(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
