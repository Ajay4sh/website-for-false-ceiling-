import { expect, test } from '@playwright/test';
import { ROUTES, expectNoHorizontalOverflow, trackErrors } from './helpers';

test.describe('every route', () => {
  for (const route of ROUTES) {
    test(`${route} renders without errors or overflow`, async ({ page }) => {
      const errors = trackErrors(page);
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      expect(await page.title()).toMatch(/Avyntro/);
      expect(errors).toEqual([]);
    });
  }
});

test('custom 404 page', async ({ page }) => {
  const res = await page.goto('/this-does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('not connected');
  await expect(page.getByRole('link', { name: 'Back to the homepage' })).toBeVisible();
});

test('unpublished industry pages are not generated', async ({ page }) => {
  expect((await page.goto('/solutions/industries/retail'))?.status()).toBe(404);
});

test('no broken internal links across the site', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'link crawl runs once');
  const links = new Set<string>();
  for (const route of ROUTES) {
    await page.goto(route);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') ?? ''));
    for (const h of hrefs) if (h.startsWith('/') && !h.startsWith('//')) links.add(h.split('#')[0]!);
  }
  const broken: string[] = [];
  for (const href of links) {
    const res = await request.get(href || '/');
    if (res.status() >= 400) broken.push(`${href} → ${res.status()}`);
  }
  expect(broken).toEqual([]);
  expect(links.size).toBeGreaterThan(15);
});

test('planned products are never labelled Live', async ({ page }) => {
  await page.goto('/products');
  for (const name of ['CRM', 'Project Management']) {
    const card = page.locator('li', { has: page.getByRole('heading', { name, exact: true }) });
    await expect(card).toContainText('Planned');
    await expect(card).not.toContainText('Live');
  }
});

test('illustrative previews are labelled as not being screenshots', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Not screenshots of the live product/).first()).toBeVisible();
});

test('security headers are set', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['x-powered-by']).toBeUndefined();
});

test('robots blocks crawling when no production URL is configured', async ({ request }) => {
  const txt = await (await request.get('/robots.txt')).text();
  expect(txt).toContain('Disallow: /');
});
