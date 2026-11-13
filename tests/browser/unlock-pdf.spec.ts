import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { monitorFileRequests } from './file-requests';

test('Unlock PDF rejects an incorrect password and downloads readable, unencrypted pages', async ({ page }) => {
  const requests = monitorFileRequests(page);
  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?*', route => route.abort());
  const fixture = await PDFDocument.create();
  fixture.addPage().drawText('Unlock fixture text');
  const original = Buffer.from(await fixture.save());
  const password = 'Unlock-Test-42!';

  await page.goto('/protect-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF' })).toBeEnabled();
  await page.getByLabel('Choose PDF').setInputFiles({ name: 'fixture.pdf', mimeType: 'application/pdf', buffer: original });
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Protect PDF', exact: true }).click();
  const protectedDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const encrypted = await readFile((await (await protectedDownload).path())!);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/unlock-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF' })).toBeEnabled();
  await page.getByLabel('Choose PDF').setInputFiles({ name: 'fixture-protected.pdf', mimeType: 'application/pdf', buffer: encrypted });
  const unlock = page.getByRole('button', { name: 'Unlock PDF', exact: true });
  await unlock.click();
  const error = page.getByRole('region', { name: 'Unlock PDF workspace' }).getByRole('alert');
  await expect(error).toHaveText('Enter the correct PDF password and try again.');
  const field = page.getByLabel('PDF password', { exact: true });
  await expect(field).toBeFocused();
  await field.fill('wrong password');
  await unlock.click();
  await expect(error).toHaveText('Enter the correct PDF password and try again.');
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
  await field.fill(password);
  await field.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your unlocked PDF is ready' })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('fixture-protected-unlocked.pdf');
  const output = await readFile((await download.path())!);
  expect((await PDFDocument.load(output)).getPageCount()).toBe(1);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: Uint8Array.from(output), useSystemFonts: true });
  try {
    const pdf = await loading.promise;
    const content = await (await pdf.getPage(1)).getTextContent();
    expect(content.items).toEqual(expect.arrayContaining([expect.objectContaining({ str: 'Unlock fixture text' })]));
  } finally { await loading.destroy(); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});
