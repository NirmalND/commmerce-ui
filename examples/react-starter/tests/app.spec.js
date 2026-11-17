// Runs against the built app (dist/) in Chromium. Playwright's locators reach inside the components' shadow roots.
import { test, expect } from '@playwright/test';

const rows = (page) => page.locator('cm-resource-item');

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('renders the orders list with pagination', async ({ page }) => {
  await expect(rows(page)).toHaveCount(10);
  await expect(page.getByText('Showing 1–10 of 24')).toBeVisible();
  await page.getByRole('button', { name: /next/i }).click();
  await expect(rows(page).first()).toContainText('#1038');
});

test('status tabs filter the list', async ({ page }) => {
  await page.getByRole('tab', { name: /Fulfilled/ }).click();
  await expect(page.getByRole('tab', { name: /Fulfilled/ })).toHaveAttribute('aria-selected', 'true');
  await expect(rows(page)).toHaveCount(8);
  for (const row of await rows(page).all()) await expect(row).toContainText('fulfilled');
});

test('search filters, and shows the empty state when nothing matches', async ({ page }) => {
  const search = page.locator('cm-search input');
  await search.fill('Priya');
  await expect(rows(page)).toHaveCount(3);
  await search.fill('no such order');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'No orders found' })).toBeVisible();
});

test('selecting rows and running the bulk action shows a toast', async ({ page }) => {
  await page.getByRole('tab', { name: /Unprocessed/ }).click();
  await expect(rows(page)).toHaveCount(8);
  await page.getByRole('checkbox', { name: 'Select Order #1048' }).check({ force: true });
  await page.getByRole('checkbox', { name: 'Select Order #1045' }).check({ force: true });
  await expect(page.getByText('2 orders selected')).toBeVisible();
  await page.getByRole('button', { name: 'Mark as fulfilled' }).click();
  await expect(page.locator('cm-toast')).toContainText('2 orders marked as fulfilled');
  await expect(rows(page)).toHaveCount(6); // they left the Unprocessed tab
  await expect(page.getByRole('tab', { name: /Fulfilled/ })).toContainText('10');
});

test('the product form validates before saving', async ({ page }) => {
  await rows(page).first().getByRole('button', { name: 'Edit product' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit product' });
  await expect(dialog).toBeVisible();
  const panel = page.locator('cm-side-panel'); // the fields are the panel's children, outside its shadow root
  const title = panel.getByRole('textbox', { name: /^Title/ });
  const price = panel.getByRole('spinbutton', { name: /^Price/ });
  const save = panel.getByRole('button', { name: 'Save' });

  await title.fill('');
  await expect(save).toBeVisible(); // the save bar appears once something changed
  await save.click();
  await expect(panel.getByText('Enter a title')).toBeVisible();
  await expect(title).toHaveAttribute('aria-invalid', 'true');

  await title.fill('Handloom kurta');
  await price.fill('0');
  await expect(panel.getByText('Enter a title')).toHaveCount(0);
  await expect(panel.getByText('Enter a price above 0')).toBeVisible();

  await price.fill('1499');
  await save.click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('cm-toast')).toContainText('Product saved');
  await expect(rows(page).first()).toContainText('Handloom kurta, Rs. 1499');
});
