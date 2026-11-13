import { degrees, PDFDocument, rgb, type StandardFonts } from 'pdf-lib';
import { loadPdf, type PdfSource } from './pdf';

export const numberPositions = ['Top left', 'Top center', 'Top right', 'Bottom left', 'Bottom center', 'Bottom right'] as const;

export type NumberPdfOptions = {
  first: number;
  last: number;
  start: number;
  skipCover: boolean;
  facing: boolean;
  position: number;
  margin: number;
  size: number;
  font: StandardFonts;
  color: string;
  template: string;
};

export async function numberPdf(source: PdfSource, options: NumberPdfOptions, preview = false) {
  const original = await loadPdf(source);
  const pageCount = original.getPageCount();
  const { last, start, margin, size, template } = options;
  const first = Math.max(options.first, options.skipCover ? 2 : 1);
  if (![options.first, last, start].every(Number.isSafeInteger) || options.first < 1 || first > last || last > pageCount || start < 1) {
    throw new Error('Choose a valid page range and a starting number of at least 1. The range must include a page after the cover if you skip it.');
  }
  if (!template.includes('{n}')) throw new Error('Include {n} in the format for the current page number.');
  const document = preview ? await PDFDocument.create() : original;
  if (preview) {
    const [sample] = await document.copyPages(original, [first - 1]);
    document.addPage(sample);
  }
  const font = await document.embedFont(options.font);
  const color = rgb(
    parseInt(options.color.slice(1, 3), 16) / 255,
    parseInt(options.color.slice(3, 5), 16) / 255,
    parseInt(options.color.slice(5, 7), 16) / 255,
  );
  const height = font.heightAtSize(size);
  const descent = height - font.heightAtSize(size, { descender: false });
  const numbered = last - first + 1;
  const pages = document.getPages().slice(preview ? 0 : first - 1, preview ? 1 : last);
  pages.forEach((page, index) => {
    const physicalPage = first + index;
    const values = { n: start + index, p: pageCount, r: numbered, rf: start + numbered - 1 };
    const text = template.replace(/\{(n|p|r|rf)\}/g, (_, key: keyof typeof values) => String(values[key]));
    let textWidth: number;
    try { textWidth = font.widthOfTextAtSize(text, size); }
    catch { throw new Error('This font cannot display some characters in your format. Try a format with supported text.'); }
    const box = page.getCropBox();
    const angle = ((page.getRotation().angle % 360) + 360) % 360;
    const sideways = angle === 90 || angle === 270;
    const width = sideways ? box.height : box.width;
    const viewHeight = sideways ? box.width : box.height;
    if (textWidth + 2 * margin > width || height + 2 * margin > viewHeight) {
      throw new Error(`The number will not fit on PDF page ${physicalPage}. Use a smaller font, margin or shorter format.`);
    }
    const side = options.position % 3;
    const column = options.facing && physicalPage % 2 === 0 ? 2 - side : side;
    const x = [margin, (width - textWidth) / 2, width - textWidth - margin][column];
    const y = (options.position < 3 ? viewHeight - margin - height : margin) + descent;
    const [pdfX, pdfY] = angle === 90 ? [box.width - y, x]
      : angle === 180 ? [box.width - x, box.height - y]
      : angle === 270 ? [y, box.height - x] : [x, y];
    page.drawText(text, { x: box.x + pdfX, y: box.y + pdfY, size, font, color, rotate: degrees(angle) });
  });
  return { bytes: await document.save(), first };
}
