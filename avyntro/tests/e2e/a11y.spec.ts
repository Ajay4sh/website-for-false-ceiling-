import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/products/hrms', '/products/erp', '/solutions', '/pricing', '/book-demo', '/integrations', '/about', '/this-does-not-exist'];

for (const path of PAGES) {
  test(`axe: ${path} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')}`);
    expect(summary).toEqual([]);
  });
}

test('axe: demo form with validation errors', async ({ page }) => {
  await page.goto('/book-demo');
  await page.getByRole('button', { name: 'Request a demo' }).click();
  const results = await new AxeBuilder({ page }).include('[data-testid="demo-form"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
