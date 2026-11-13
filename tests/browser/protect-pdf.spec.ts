import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { monitorFileRequests } from './file-requests';

test('Protect PDF downloads an AES-256 PDF that opens only with the matching password', async ({ page }) => {
  const requests = monitorFileRequests(page);
  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?*', route => route.abort());
  const fixture = await PDFDocument.create();
  fixture.addPage().drawText('Confidential fixture');
  const original = Buffer.from(await fixture.save());
  const password = 'Local-Test-42!';

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/protect-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF' })).toBeEnabled();
  await page.getByLabel('Choose PDF').setInputFiles({ name: 'fixture.pdf', mimeType: 'application/pdf', buffer: original });
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill('Wrong-password');
  await expect(page.getByText('Passwords do not match.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Protect PDF', exact: true })).toBeDisabled();
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Protect PDF', exact: true }).click();
  await page.locator('.tool-panel[aria-busy="false"]').waitFor();
  await expect(page.getByRole('heading', { name: 'Your protected PDF is ready' })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('fixture-protected.pdf');
  const output = await readFile((await download.path())!);
  const encrypted = await PDFDocument.load(output, { ignoreEncryption: true, updateMetadata: false });
  const dictionary = encrypted.context.lookup(encrypted.context.trailerInfo.Encrypt);
  expect(dictionary).toBeInstanceOf(PDFDict);
  expect((dictionary as PDFDict).get(PDFName.of('Length'))?.toString()).toBe('256');
  expect((dictionary as PDFDict).get(PDFName.of('R'))?.toString()).toBe('6');

  const { getDocument, PasswordResponses } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  for (const attempt of [undefined, 'Wrong-password']) {
    const loading = getDocument({ data: Uint8Array.from(output), password: attempt });
    try {
      await expect(loading.promise).rejects.toMatchObject({
        name: 'PasswordException',
        code: attempt ? PasswordResponses.INCORRECT_PASSWORD : PasswordResponses.NEED_PASSWORD,
      });
    } finally { await loading.destroy(); }
  }
  const loading = getDocument({ data: Uint8Array.from(output), password, useSystemFonts: true });
  try {
    const pdf = await loading.promise;
    expect(pdf.numPages).toBe(1);
    const content = await (await pdf.getPage(1)).getTextContent();
    expect(content.items).toEqual(expect.arrayContaining([expect.objectContaining({ str: 'Confidential fixture' })]));
  } finally { await loading.destroy(); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});
