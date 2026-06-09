import { test, expect } from '@playwright/test';

const ADMIN = {
  email: process.env['E2E_ADMIN_EMAIL'] ?? '',
  password: process.env['E2E_ADMIN_PASSWORD'] ?? '',
};

test.describe('Admin product lifecycle', () => {
  test('login redirects to dashboard and shows real chart data', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input#email').fill(ADMIN.email);
    await page.locator('input#password').fill(ADMIN.password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/dashboard');
    await expect(page.locator('canvas')).toHaveCount(2);
    const kpiValues = await page.locator('.font-display.text-2xl').allTextContents();
    expect(kpiValues.length).toBeGreaterThanOrEqual(8);
  });

  test('products list shows action buttons for admin', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input#email').fill(ADMIN.email);
    await page.locator('input#password').fill(ADMIN.password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/dashboard');
    await page.goto('/products');
    await expect(page.locator('article.card').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Editar' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Desactivar' }).first()).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Incluir inactivos/ })).toBeVisible();
  });

  test('edit page loads existing product values', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input#email').fill(ADMIN.email);
    await page.locator('input#password').fill(ADMIN.password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/dashboard');
    await page.goto('/products');
    await page.locator('a[href*="/edit"]').first().click();
    await page.waitForURL('**/edit');
    await expect(page.getByRole('heading', { name: 'Editar producto' })).toBeVisible();
    const sku = await page.locator('input#sku').inputValue();
    expect(sku.length).toBeGreaterThan(0);
    const name = await page.locator('input#name').inputValue();
    expect(name.length).toBeGreaterThan(0);
  });
});
