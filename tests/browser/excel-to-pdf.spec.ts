import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { monitorFileRequests } from './file-requests';

test('Excel to PDF renders two worksheets with a print area and landscape setup', async ({ page }) => {
  const requests = monitorFileRequests(page);
  const workbook = new JSZip();
  const sheetNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const relationNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const packageNs = 'http://schemas.openxmlformats.org/package/2006/relationships';
  workbook.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  workbook.file('_rels/.rels', `<Relationships xmlns="${packageNs}"><Relationship Id="rId1" Type="${relationNs}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  workbook.file('xl/workbook.xml', `<workbook xmlns="${sheetNs}" xmlns:r="${relationNs}"><sheets><sheet name="Sales" sheetId="1" r:id="rId1"/><sheet name="Costs" sheetId="2" r:id="rId2"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">Sales!$A$1:$A$1</definedName></definedNames></workbook>`);
  workbook.file('xl/_rels/workbook.xml.rels', `<Relationships xmlns="${packageNs}"><Relationship Id="rId1" Type="${relationNs}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${relationNs}/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`);
  workbook.file('xl/worksheets/sheet1.xml', `<worksheet xmlns="${sheetNs}"><cols><col min="1" max="1" width="30" customWidth="1"/></cols><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Sales total</t></is></c><c r="B1" t="inlineStr"><is><t>Outside print area</t></is></c></row></sheetData><pageSetup paperSize="9" orientation="landscape"/></worksheet>`);
  workbook.file('xl/worksheets/sheet2.xml', `<worksheet xmlns="${sheetNs}"><cols><col min="1" max="1" width="30" customWidth="1"/></cols><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Costs total</t></is></c></row></sheetData></worksheet>`);
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/excel-to-pdf/');
  await expect(page.getByRole('button', { name: 'Select Excel workbook' })).toBeEnabled();
  const picker = page.getByLabel('Choose Excel workbook', { exact: true });
  const convert = page.getByRole('button', { name: 'Convert to PDF', exact: true });
  await picker.setInputFiles({ name: 'invalid.xlsx', mimeType, buffer: Buffer.from('invalid workbook') });
  await convert.click();
  await expect(page.getByRole('region', { name: 'Excel to PDF workspace' }).getByRole('alert')).toContainText('Could not convert this workbook.');
  await picker.setInputFiles({ name: 'report.xlsx', mimeType, buffer: await workbook.generateAsync({ type: 'nodebuffer' }) });
  await convert.click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({ timeout: 15_000 });
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('report.pdf');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: Uint8Array.from(await readFile((await download.path())!)) });
  try {
    const pdf = await loading.promise;
    expect(pdf.numPages).toBe(2);
    const first = await pdf.getPage(1);
    const viewport = first.getViewport({ scale: 1 });
    expect(viewport.width).toBeGreaterThan(viewport.height);
    const firstText = (await first.getTextContent()).items;
    expect(firstText).toEqual(expect.arrayContaining([expect.objectContaining({ str: 'Sales total' })]));
    expect(firstText).not.toEqual(expect.arrayContaining([expect.objectContaining({ str: 'Outside print area' })]));
    expect((await (await pdf.getPage(2)).getTextContent()).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ str: 'Costs total' })]),
    );
  } finally { await loading.destroy(); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});
