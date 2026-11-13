import { expect, test } from '@playwright/test';

test('encodes URL components, preserves full URL separators, and reports invalid escapes', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/url-encoder/');
  const input = page.getByRole('textbox', { name: 'Input', exact: true });
  const output = page.getByRole('textbox', { name: 'Output', exact: true });
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(output).toHaveValue('caf%C3%A9%20%26%20tea%20%2B%20lemon');
  await page.getByRole('button', { name: 'Reverse direction' }).click();
  await expect(output).toHaveValue('café & tea + lemon');
  await input.fill('%E0%A4%A');
  await expect(page.locator('.tool-panel [role=alert]')).toContainText('Invalid percent encoding');
  await expect(page.getByRole('button', { name: 'Copy output' })).toBeDisabled();
  await input.fill('a+b%20c');
  await expect(output).toHaveValue('a+b c');
  await page.getByRole('combobox', { name: 'Action' }).selectOption('encode');
  await page.getByRole('combobox', { name: 'Input type' }).selectOption('url');
  await input.fill('https://example.com/café?q=two words&lang=en');
  const encoded = 'https://example.com/caf%C3%A9?q=two%20words&lang=en';
  await expect(output).toHaveValue(encoded);
  await page.getByRole('button', { name: 'Copy output' }).click();
  await expect(page.locator('.tool-panel [role=status]')).toHaveText('Copied to clipboard.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(encoded);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
