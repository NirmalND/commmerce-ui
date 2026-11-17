// Runs against the built app in Chromium. Playwright's locators reach inside the components' shadow roots.
// The same tests run against every framework starter (Vue, Angular, Svelte, Next.js).
import { test, expect } from '@playwright/test';

const tableRows = (page) => page.locator('cm-data-table tbody tr');
const modal = (page) => page.getByRole('dialog', { name: 'New order' });
const customer = (page) => page.locator('cm-modal').getByRole('textbox', { name: /^Customer/ });
const draft = (page) => page.getByTestId('draft');
let errors = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible();
});

test.afterEach(() => { expect(errors).toEqual([]); });

test('renders the table from an array', async ({ page }) => {
  await expect(tableRows(page)).toHaveCount(4);
  await expect(tableRows(page).first()).toContainText('Priya Sharma');
  await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible();
});

test('the modal opens and closes from framework state, including after Esc', async ({ page }) => {
  await page.getByRole('button', { name: 'New order' }).click();
  await expect(modal(page)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(modal(page)).toBeHidden();

  await page.getByRole('button', { name: 'New order' }).click();
  await expect(modal(page)).toBeVisible();
  await page.keyboard.press('Escape'); // the modal closes itself; cm-close puts the state back to closed
  await expect(modal(page)).toBeHidden();
  await page.getByRole('button', { name: 'New order' }).click(); // so opening again still works
  await expect(modal(page)).toBeVisible();
});

test('text field, select and checkbox are two-way bound', async ({ page }) => {
  await page.getByRole('button', { name: 'New order' }).click();
  // state -> element: the select shows the default status held in state
  await expect(page.getByRole('combobox', { name: /^Status/ })).toContainText('Unprocessed');
  await expect(draft(page)).toHaveText('Draft: (no customer) · unprocessed · unpaid');

  // element -> state: each event updates the summary rendered from state
  await customer(page).fill('Asha Rao');
  await expect(draft(page)).toHaveText('Draft: Asha Rao · unprocessed · unpaid');
  await page.getByRole('combobox', { name: /^Status/ }).click();
  await page.getByRole('option', { name: 'Processing' }).click();
  await expect(draft(page)).toHaveText('Draft: Asha Rao · processing · unpaid');
  await page.getByRole('checkbox', { name: 'Paid' }).check({ force: true });
  await expect(draft(page)).toHaveText('Draft: Asha Rao · processing · paid');

  // state -> element again: "Clear" resets state, and the fields follow
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(customer(page)).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: 'Paid' })).not.toBeChecked();
  await expect(page.getByRole('combobox', { name: /^Status/ })).toContainText('Unprocessed');
  await expect(draft(page)).toHaveText('Draft: (no customer) · unprocessed · unpaid');
});

test('the form does not submit while a required field is empty', async ({ page }) => {
  await page.getByRole('button', { name: 'New order' }).click();
  await page.getByRole('button', { name: 'Create order' }).click();
  await expect(modal(page)).toBeVisible();
  // native constraint validation: the form-associated field reports valueMissing, so requestSubmit() stops
  expect(await page.locator('cm-text-field[name="customer"]').evaluate((el) => el.validity.valueMissing)).toBe(true);
  await expect(tableRows(page)).toHaveCount(4);
});

test('submitting reads FormData, adds a row and closes the modal', async ({ page }) => {
  await page.getByRole('button', { name: 'New order' }).click();
  await customer(page).fill('Asha Rao');
  await page.getByRole('combobox', { name: /^Status/ }).click();
  await page.getByRole('option', { name: 'Processing' }).click();
  await page.getByRole('checkbox', { name: 'Paid' }).check({ force: true });
  await page.getByRole('button', { name: 'Create order' }).click();

  await expect(modal(page)).toBeHidden();
  await expect(page.getByTestId('submitted')).toHaveText('Submitted: customer=Asha Rao, status=processing, paid=yes');
  await expect(tableRows(page)).toHaveCount(5);
  await expect(tableRows(page).first()).toContainText('#1005');
  await expect(tableRows(page).first()).toContainText('Asha Rao');
  await expect(tableRows(page).first()).toContainText('Processing');
  await expect(tableRows(page).first()).toContainText('Paid');

  // opening again starts from an empty form
  await page.getByRole('button', { name: 'New order' }).click();
  await expect(customer(page)).toHaveValue('');
});
