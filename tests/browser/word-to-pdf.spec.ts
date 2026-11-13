import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { monitorFileRequests } from './file-requests';

test('Word to PDF rejects invalid documents and downloads selectable text from a DOCX', async ({ page }) => {
  const requests = monitorFileRequests(page);
  const fixture = new JSZip();
  fixture.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  fixture.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  fixture.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Zipora Word fixture</w:t></w:r></w:p><w:p><w:r><w:br w:type="page"/><w:t>Second page of the document</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440"/></w:sectPr></w:body></w:document>');
  const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/word-to-pdf/');
  await expect(page.getByRole('button', { name: 'Select Word document' })).toBeEnabled();
  const picker = page.getByLabel('Choose Word document', { exact: true });
  const convert = page.getByRole('button', { name: 'Convert to PDF', exact: true });
  await picker.setInputFiles({ name: 'invalid.docx', mimeType, buffer: Buffer.from('not a Word document') });
  await expect(page.locator('.tool-session-controls [role=alert]')).toContainText('not a supported format');
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
  await picker.setInputFiles({ name: 'sample.docx', mimeType, buffer: await fixture.generateAsync({ type: 'nodebuffer' }) });
  await convert.click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({ timeout: 15_000 });
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('sample.pdf');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: Uint8Array.from(await readFile((await download.path())!)) });
  try {
    const pdf = await loading.promise;
    expect(pdf.numPages).toBe(2);
    for (const [index, text] of ['Zipora Word fixture', 'Second page of the document'].entries()) {
      const content = await (await pdf.getPage(index + 1)).getTextContent();
      expect(content.items).toEqual(expect.arrayContaining([expect.objectContaining({ str: text })]));
    }
  } finally { await loading.destroy(); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});
