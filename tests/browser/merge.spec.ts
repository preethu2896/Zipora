import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { monitorFileRequests } from './file-requests';

async function fixture(name: string, widths: number[]) {
  const doc = await PDFDocument.create();
  for (const width of widths) { const page = doc.addPage([width, 600]); page.drawText(name, { x: 30, y: 500 }); }
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(await doc.save()) };
}
test('merge, reorder, rename, download twice, and invalidate stale output', async ({ page }) => {
  // Plain HTTP Wi-Fi origins do not expose this secure-context API on phones.
  await page.addInitScript(() => { Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true }); });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const posts = monitorFileRequests(page);
  await page.goto('/merge-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF files', exact: true })).toBeEnabled({timeout:15000});
  await expect(page.getByRole('button', { name: 'Merge PDFs', exact: true })).toBeDisabled();
  const chooserEvent = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Select PDF files', exact: true }).click();
  await (await chooserEvent).setFiles([await fixture('first.pdf', [301, 302])]);
  await expect(page.getByText('Add one more PDF to merge your files.')).toBeVisible();
  await page.getByLabel('Choose PDF files').setInputFiles([await fixture('second.pdf', [401])]);
  await expect(page.getByText('3 pages in total')).toBeVisible();
  await expect(page.locator('.order-hint')).toHaveText('Use the arrows to rearrange.');
  await page.getByLabel('Move second.pdf up').click();
  await expect(page.locator('.file-row').first()).toContainText('second.pdf');
  await page.getByLabel('Output filename').fill('my-report');
  await page.getByRole('button', { name: 'Merge PDFs', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready.' })).toBeVisible();
  await expect(page.locator('.ad-download')).toHaveCount(1);
  expect(await page.locator('.result').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('.ad-download')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBeTruthy();
  for (let i = 0; i < 2; i++) {
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('my-report.pdf');
    const path = await download.path();
    const doc = await PDFDocument.load(await readFile(path!));
    expect(doc.getPages().map(p => p.getWidth())).toEqual([401, 301, 302]);
  }
  await page.locator('.result').screenshot({ path: 'research/zipora-download-button.png' });
  await page.getByLabel('Move second.pdf down').click();
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toHaveCount(0);
  await page.getByLabel('Remove first.pdf').click();
  await expect(page.getByRole('button', { name: 'Merge PDFs', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page.locator('.file-row')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(posts).toEqual([]);
});
test('bad inputs show errors while valid files in the same batch remain usable', async ({ page }) => {
  await page.goto('/merge-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF files', exact: true })).toBeEnabled({timeout:15000});
  await page.getByLabel('Choose PDF files').setInputFiles([
    { name: 'bad.pdf', mimeType: 'application/pdf', buffer: Buffer.from('broken') },
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('text') },
    await fixture('good.pdf', [300]),
  ]);
  await expect(page.locator('.error-message')).toContainText('could not be read');
  await expect(page.locator('.error-message')).toContainText('not a PDF');
  await expect(page.locator('.file-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Dismiss error' }).click();
  await expect(page.locator('.error-message')).toHaveCount(0);
  await page.getByLabel('Choose PDF files').setInputFiles(await fixture('other.pdf', [400]));
  await page.getByRole('button', { name: 'Merge PDFs', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeVisible();
});
test('drag and drop adds real PDFs', async ({ page }) => {
  await page.goto('/merge-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF files', exact: true })).toBeEnabled({timeout:15000});
  const pdf = await fixture('dropped.pdf', [300]);
  const transfer = await page.evaluateHandle(({ bytes, name }) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(bytes)], name, { type: 'application/pdf' }));
    return transfer;
  }, { bytes: Array.from(pdf.buffer), name: pdf.name });
  await page.locator('.drop-zone').dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.locator('.file-row')).toContainText('dropped.pdf');
});
test('mobile layout, long names, keyboard operation, FAQs, and screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/merge-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF files', exact: true })).toBeEnabled({timeout:15000});
  await page.getByLabel('Choose PDF files').setInputFiles([await fixture('a-very-long-document-name-that-must-not-break-the-layout.pdf', [300]), await fixture('second.pdf', [400])]);
  await expect(page.locator('.file-row')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('Move second.pdf up').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.file-row').first()).toContainText('second.pdf');
  await page.getByText('Which files can the PDF merger accept?', { exact: true }).click();
  await expect(page.getByText('Choose at least two valid, unlocked PDFs', { exact: false })).toBeVisible();
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: 'research/zipora-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'research/zipora-desktop.png', fullPage: true });
});

test('encrypted PDFs are rejected with an unlock instruction', async ({ page }) => {
  await page.goto('/merge-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF files', exact: true })).toBeEnabled({timeout:15000});
  await page.getByLabel('Choose PDF files').setInputFiles('tests/fixtures/locked.pdf');
  await expect(page.locator('.error-message')).toContainText('password-protected');
  await expect(page.locator('.file-row')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Merge PDFs', exact: true })).toBeDisabled();
});

test('redesigned homepage and empty merger work on desktop and mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Free PDF, Image & Video Tools' })).toBeVisible();
  await page.screenshot({ path: 'research/zipora-home-desktop.png', fullPage: true });
  await page.locator('.home-tool-list a[href="/merge-pdf/"]').click();
  await expect(page.getByRole('heading', { name: 'Merge PDF Online Free', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select PDF files', exact: true })).toBeEnabled({timeout:15000});
  await page.screenshot({ path: 'research/zipora-tool-empty.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'research/zipora-home-mobile.png', fullPage: true });
  await page.locator('.home-tool-list a[href="/merge-pdf/"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reordering respects reduced motion while preserving file order and controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/merge-pdf/');
  await expect(page.locator('.upload-button')).toBeEnabled({ timeout: 15000 });
  await page.getByLabel('Choose PDF files').setInputFiles([await fixture('one.pdf', [300]), await fixture('two.pdf', [400])]);
  await expect(page.locator('.file-row')).toHaveCount(2);
  await page.getByLabel('Move two.pdf up').click();
  await expect(page.locator('.file-row').first()).toContainText('two.pdf');
  expect(await page.locator('.file-row').first().evaluate(element => element.getAnimations().length)).toBe(0);
  await expect(page.getByRole('button', { name: 'Merge PDFs', exact: true })).toBeEnabled();
});
