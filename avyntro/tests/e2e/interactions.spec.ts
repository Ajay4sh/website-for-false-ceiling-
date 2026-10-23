import { expect, test } from '@playwright/test';

test.describe('navigation', () => {
  test('desktop dropdown works with the keyboard', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop navigation');
    await page.goto('/');
    const btn = page.getByRole('button', { name: 'Platform' });
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    const hrms = page.getByRole('link', { name: /Avyntro HRMS/ }).first();
    await expect(hrms).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(btn).toBeFocused();
    await btn.click();
    await hrms.click();
    await expect(page).toHaveURL(/\/products\/hrms$/);
  });

  test('mobile menu opens, navigates and closes', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', 'mobile/tablet navigation');
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Open menu' });
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    const mobileNav = page.getByRole('navigation', { name: 'Mobile' });
    await mobileNav.getByText('Platform', { exact: true }).click();
    await mobileNav.getByRole('link', { name: 'Avyntro ERP' }).click();
    await expect(page).toHaveURL(/\/products\/erp$/);
    await expect(mobileNav).toBeHidden();
  });

  test('skip link moves focus to main content', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'keyboard');
    await page.goto('/pricing');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });
});

test('product explorer switches products by click and keyboard', async ({ page }) => {
  await page.goto('/');
  const tablist = page.getByRole('tablist', { name: 'Avyntro products' });
  const hrms = tablist.getByRole('tab', { name: /HRMS/ });
  const erp = tablist.getByRole('tab', { name: /ERP/ });
  await expect(hrms).toHaveAttribute('aria-selected', 'true');
  await erp.click();
  await expect(erp).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: /ERP/ })).toContainText('Avyntro ERP');
  await expect(page.getByRole('tabpanel', { name: /HRMS/ })).toBeHidden();
  await page.keyboard.press('ArrowLeft');
  await expect(hrms).toBeFocused();
  await expect(hrms).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: /HRMS/ }).getByRole('link', { name: 'Book a HRMS demo' })).toHaveAttribute('href', '/book-demo?product=hrms');
});

test('solution finder separates available and planned products', async ({ page }) => {
  await page.goto('/solutions');
  const result = page.getByTestId('finder-result');
  await expect(result).toContainText('Your recommendation will appear here');
  await page.getByLabel('Business size').selectOption('11-50');
  await page.getByLabel('Department or function').selectOption('sales');
  await page.getByLabel('Main challenge').selectOption('manual');
  await expect(result).toContainText('Available now');
  await expect(result).toContainText('Avyntro ERP');
  await expect(result).toContainText('Planned, not yet available');
  await expect(result).toContainText('Avyntro CRM');
  await expect(result.getByRole('link', { name: 'Book a demo' })).toHaveAttribute('href', '/book-demo?product=erp');
});
