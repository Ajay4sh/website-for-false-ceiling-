import { expect, test, type Page } from '@playwright/test';

async function fill(page: Page, company: string, requirements = '') {
  const form = page.getByTestId('demo-form');
  await form.getByLabel('Full name *').fill('Asha Rao');
  await form.getByLabel('Business email *').fill('asha@example.com');
  await form.getByLabel('Company *').fill(company);
  await form.getByLabel('Company size *').selectOption('51-250');
  await form.getByLabel(/product would you like to see/).selectOption('both');
  if (requirements) await form.getByLabel('What would you like to achieve?').fill(requirements);
  await form.getByRole('checkbox').check();
  // The server rejects submissions completed faster than a person could type.
  await page.waitForTimeout(3200);
}

test.describe('demo form', () => {
  test('shows accessible validation errors and focuses the first invalid field', async ({ page }) => {
    await page.goto('/book-demo');
    await page.getByRole('button', { name: 'Request a demo' }).click();
    const form = page.getByTestId('demo-form');
    await expect(form.getByRole('alert')).toContainText('Please correct');
    const name = form.getByLabel('Full name *');
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByText('Enter your full name.')).toBeVisible();
    await expect(form.getByText('Please confirm you agree')).toBeVisible();
    await form.getByLabel('Business email *').fill('not-an-email');
    await page.getByRole('button', { name: 'Request a demo' }).click();
    await expect(form.getByText('Enter a valid business email address.')).toBeVisible();
  });

  test('succeeds only after the backend accepts the request', async ({ page, request }) => {
    const company = `E2E Success ${test.info().project.name} ${Date.now()}`;
    await page.goto('/book-demo');
    await fill(page, company);
    await page.getByRole('button', { name: 'Request a demo' }).click();
    await expect(page.getByRole('heading', { name: /demo request has been received/ })).toBeFocused();
    await expect(page.getByText(/Reference:/)).toBeVisible();
    const received = await (await request.get('http://127.0.0.1:3299/received')).json();
    expect(received.some((r: { company: string; signed: boolean }) => r.company === company && r.signed)).toBe(true);
  });

  test('shows an error, not success, when delivery fails', async ({ page }) => {
    await page.goto('/book-demo');
    await fill(page, 'E2E Failure Co', 'simulate-failure');
    await page.getByRole('button', { name: 'Request a demo' }).click();
    // Scope to the form: Next.js also renders a route announcer with role=alert.
    const alert = page.getByTestId('demo-form').getByRole('alert');
    await expect(alert).toContainText('could not send your request');
    await expect(page.getByText(/has been received/)).toHaveCount(0);
    await expect(page.getByLabel('Company *')).toHaveValue('E2E Failure Co');
  });

  test('blocks double submission while sending', async ({ page }) => {
    let calls = 0;
    await page.route('/api/demo', async (route) => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await page.goto('/book-demo');
    await fill(page, `E2E Double ${Date.now()}`);
    const submit = page.getByRole('button', { name: 'Request a demo' });
    await submit.click();
    await expect(page.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    await page.getByRole('button', { name: 'Sending…' }).click({ force: true }).catch(() => {});
    await expect(page.getByRole('heading', { name: /has been received/ })).toBeVisible();
    expect(calls).toBe(1);
  });

  test('pre-selects product and intent from the URL', async ({ page }) => {
    await page.goto('/book-demo?product=erp');
    await expect(page.getByTestId('demo-form').getByLabel(/product would you like to see/)).toHaveValue('erp');
    await page.goto('/book-demo?intent=interest&product=crm');
    await expect(page.getByRole('button', { name: 'Register interest' })).toBeVisible();
    await expect(page.getByLabel(/upcoming product interests you/)).toHaveValue('crm');
  });

  test('API rejects invalid and oversized requests', async ({ request }) => {
    expect((await request.post('/api/demo', { data: { fullName: '' } })).status()).toBe(422);
    expect((await request.post('/api/demo', { headers: { 'content-type': 'application/json' }, data: 'x'.repeat(20000) })).status()).toBe(413);
    expect((await request.get('/api/demo')).status()).toBe(405);
  });
});
