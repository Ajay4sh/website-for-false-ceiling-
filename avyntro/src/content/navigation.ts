import { liveProducts } from './products';
import { publishedIndustries } from './solutions';

export interface NavLink { label: string; href: string; description?: string }
export interface NavGroup { label: string; href: string; children?: NavLink[] }

export function getMainNav(): NavGroup[] {
  return [
    {
      label: 'Platform',
      href: '/platform',
      children: [
        { label: 'Platform overview', href: '/platform', description: 'How the Avyntro products fit together' },
        ...liveProducts().map((p) => ({ label: p.name, href: p.href!, description: p.tagline })),
        { label: 'All products', href: '/products', description: 'Live and upcoming products' },
      ],
    },
    {
      label: 'Solutions',
      href: '/solutions',
      children: [
        { label: 'Solutions overview', href: '/solutions', description: 'Find the right products for your needs' },
        ...publishedIndustries().map((i) => ({ label: i.name, href: `/solutions/industries/${i.slug}` })),
      ],
    },
    { label: 'Integrations', href: '/integrations' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Resources', href: '/resources' },
    { label: 'About', href: '/about' },
  ];
}
