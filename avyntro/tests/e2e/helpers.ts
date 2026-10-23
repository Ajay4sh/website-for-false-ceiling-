import { expect, type Page } from '@playwright/test';

export const ROUTES = [
  '/', '/platform', '/products', '/products/hrms', '/products/erp', '/integrations', '/solutions',
  '/solutions/industries/professional-services', '/solutions/industries/distribution', '/solutions/industries/manufacturing',
  '/pricing', '/about', '/contact', '/book-demo', '/resources', '/privacy', '/terms',
];

/** Collects console errors and uncaught exceptions for the page's lifetime. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
}
