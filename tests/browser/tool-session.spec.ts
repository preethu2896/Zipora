import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('dragging uses the same upload flow, rejects fake PDFs and clears the workspace', async ({ page }) => {
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('Zipora drag test');
  await page.goto('/pdf-to-excel/');
  await expect(page.getByRole('button', { name: 'Select PDF' })).toBeEnabled();
  const zone = page.locator('.drop-zone');
  const makeTransfer = (bytes: number[]) => page.evaluateHandle(data => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([Uint8Array.from(data)], 'test.pdf', { type: 'application/pdf' }));
    return transfer;
  }, bytes);
  const bad = await makeTransfer([77, 90, 1, 2]);
  await zone.dispatchEvent('drop', { dataTransfer: bad });
  await expect(page.getByText('This file is not a valid PDF, please upload a PDF file.')).toBeVisible();
  const good = await makeTransfer(Array.from(await pdf.save()));
  await zone.dispatchEvent('dragover', { dataTransfer: good });
  await expect(zone).toHaveAttribute('data-file-drag', 'true');
  await zone.dispatchEvent('drop', { dataTransfer: good });
  await expect(zone).not.toHaveAttribute('data-file-drag', 'true');
  await expect(page.getByRole('button', { name: 'Convert to Excel' })).toBeEnabled();
  await page.getByRole('button', { name: 'Clear tool' }).click();
  await expect(page.getByRole('button', { name: 'Convert to Excel' })).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recently used' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recently added' })).toBeVisible();
});

test('QR format changes keep the preview and update the actual download', async ({ page }) => {
  await page.goto('/qr-code-generator/');
  await page.getByRole('button', { name: 'Wi-Fi QR', exact: true }).click();
  await page.getByLabel('Network name').fill('Test;WiFi');
  await page.getByRole('button', { name: 'Use preset' }).click();
  await expect(page.getByLabel('Text or URL')).toHaveValue('WIFI:T:nopass;S:Test\\;WiFi;;');
  await page.getByRole('button', { name: 'Generate QR code', exact: false }).click();
  const preview = page.getByRole('img', { name: 'Generated QR code' });
  await expect(preview).toBeVisible();
  const src = await preview.getAttribute('src');
  for (const format of ['svg', 'png']) {
    await page.getByLabel('Download format').selectOption(format);
    await expect(preview).toHaveAttribute('src', src!);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download QR code' }).click();
    expect((await pending).suggestedFilename()).toBe(`zipora-qr.${format}`);
  }
});
