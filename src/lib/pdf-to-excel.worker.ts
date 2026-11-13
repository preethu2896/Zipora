import JSZip from 'jszip';
import { getDocument, PDFWorker, PasswordResponses } from 'pdfjs-dist';

type Fragment = { x: number; y: number; width: number; height: number; text: string };
type Cell = { start: number; end: number; text: string };

function inferRows(fragments: Fragment[]) {
  const lines: Fragment[][] = [];
  for (const fragment of fragments.sort((a, b) => a.y - b.y || a.x - b.x)) {
    const last = lines.at(-1);
    if (last && Math.abs(last[0].y - fragment.y) <= Math.max(2, fragment.height * 0.25)) last.push(fragment);
    else lines.push([fragment]);
  }
  const rows = lines.map(line => {
    const cells: Cell[] = [];
    for (const part of line.sort((a, b) => a.x - b.x)) {
      const last = cells.at(-1);
      if (last && part.x - last.end <= Math.max(3, part.height * 0.55)) {
        last.text += part.x - last.end > 0.5 ? ' ' + part.text : part.text;
        last.end = Math.max(last.end, part.x + part.width);
      } else {
        cells.push({ start: part.x, end: part.x + part.width, text: part.text });
      }
    }
    return cells;
  });

  // Reuse left or right edges so that shorter values in a right-aligned column stay together.
  const columns: Cell[] = [];
  const cellColumns = new Map<Cell, Cell>();
  for (const row of [...rows].sort((a, b) => b.length - a.length)) {
    const claimed = new Set<Cell>();
    for (const cell of row) {
      const column = columns.find(candidate => !claimed.has(candidate) &&
        Math.min(Math.abs(candidate.start - cell.start), Math.abs(candidate.end - cell.end)) <= 4) ?? cell;
      if (column === cell) columns.push(column);
      claimed.add(column);
      cellColumns.set(cell, column);
    }
  }
  columns.sort((a, b) => a.start - b.start);
  const indices = new Map(columns.map((column, index) => [column, index]));
  return rows.map(row => row.map(cell => ({
    index: indices.get(cellColumns.get(cell)!)!,
    text: cell.text,
  })));
}

const spreadsheet = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relationship = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageRelationship = 'http://schemas.openxmlformats.org/package/2006/relationships';

function columnName(index: number) {
  let name = '';
  for (let number = index + 1; number > 0; number = Math.floor((number - 1) / 26)) {
    name = String.fromCharCode(65 + (number - 1) % 26) + name;
  }
  return name;
}

function xmlText(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/_x[0-9a-f]{4}_/gi, match => '_x005F_' + match.slice(1))
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function cellXml(text: string, address: string) {
  // Preserve leading zeros, identifiers over Excel's precision limit and formula-like strings.
  const number = text.replaceAll(',', '');
  const digits = number.replace(/[^0-9]/g, '');
  if (/^-?(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d+)?$/.test(text) &&
      digits.length <= 15 && !Object.is(Number(number), -0)) {
    return `<c r="${address}"><v>${number}</v></c>`;
  }
  return `<c r="${address}" t="inlineStr"><is><t xml:space="preserve">${xmlText(text)}</t></is></c>`;
}

self.onmessage = async ({ data: file }: MessageEvent<File>) => {
  let port: Worker | undefined;
  let loading: ReturnType<typeof getDocument> | undefined;
  try {
    port = new Worker(new URL('/pdfjs/pdf.worker.min.mjs', self.location.origin).href, { type: 'module' });
    loading = getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      worker: PDFWorker.create({ port }),
      cMapUrl: self.location.origin + '/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: self.location.origin + '/pdfjs/standard_fonts/',
      wasmUrl: self.location.origin + '/pdfjs/wasm/',
      useWorkerFetch: true,
      isEvalSupported: false,
    });
    const pdf = await loading.promise;
    const archive = new JSZip();
    const data: string[] = [];
    let pagesWithText = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const fragments = content.items.flatMap(item => {
        if (!('str' in item) || !item.str.trim()) return [];
        const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        return [{ x, y, width: item.width, height: item.height, text: item.str.trim() }];
      });
      page.cleanup();
      if (!fragments.length) continue;
      pagesWithText++;
      const rows = inferRows(fragments);
      for (const row of rows) {
        const index = data.length + 1;
        if (index > 1_048_576 || row.some(cell => cell.index >= 16_384)) {
          self.postMessage({ error: 'This PDF exceeds Excel’s sheet limits. Split the PDF and try again.' });
          return;
        }
        data.push(`<row r="${index}">${row.sort((a, b) => a.index - b.index)
          .map(cell => cellXml(cell.text, columnName(cell.index) + index)).join('')}</row>`);
      }
    }
    if (!pagesWithText) {
      self.postMessage({ error: 'No selectable text found. Scanned pages need OCR before conversion.' });
      return;
    }
    archive.file('[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
    archive.file('_rels/.rels', `<Relationships xmlns="${packageRelationship}"><Relationship Id="rId1" Type="${relationship}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    archive.file('xl/workbook.xml', `<workbook xmlns="${spreadsheet}" xmlns:r="${relationship}"><sheets><sheet name="PDF data" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    archive.file('xl/_rels/workbook.xml.rels', `<Relationships xmlns="${packageRelationship}"><Relationship Id="rId1" Type="${relationship}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
    archive.file('xl/worksheets/sheet1.xml', `<worksheet xmlns="${spreadsheet}"><sheetData>${data.join('')}</sheetData></worksheet>`);
    const bytes = await archive.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
    const notice = pagesWithText < pdf.numPages
      ? 'Pages without selectable text were skipped. Check the inferred columns in Excel.'
      : 'Check the inferred rows and columns in Excel before using the data.';
    self.postMessage({ bytes, notice }, { transfer: [bytes] });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error && 'code' in error && error.code === PasswordResponses.NEED_PASSWORD
        ? 'This PDF needs a password. Unlock it first, then try again.'
        : 'Could not convert this PDF. Check that it opens in a PDF reader, then try again.',
    });
  } finally {
    try { await loading?.destroy(); } finally { port?.terminate(); }
  }
};
