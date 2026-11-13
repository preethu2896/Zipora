import { degrees, PDFArray, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { loadPdf, type PdfSource } from './pdf';

export const watermarkPositions = [
  'Top left', 'Top center', 'Top right',
  'Middle left', 'Center', 'Middle right',
  'Bottom left', 'Bottom center', 'Bottom right',
] as const;

export type WatermarkOptions = {
  stamp: { text: string; color: string; font: StandardFonts } | { image: File };
  position: number;
  size: number;
  opacity: number;
  angle: number;
  first: number;
  last: number;
  layer: 'over' | 'under';
  repeat: boolean;
};

export async function watermarkPdf(source: PdfSource, options: WatermarkOptions, preview = false) {
  const original = await loadPdf(source);
  const { first, last, stamp } = options;
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || first > last || last > original.getPageCount()) {
    throw new Error(`Enter a page range from 1 to ${original.getPageCount()}.`);
  }
  const document = preview ? await PDFDocument.create() : original;
  if (preview) {
    const [page] = await document.copyPages(original, [first - 1]);
    document.addPage(page);
  }

  const image = 'image' in stamp ? await embedStamp(document, stamp.image) : undefined;
  const text = 'text' in stamp ? stamp.text.trim() : '';
  const font = 'font' in stamp ? await document.embedFont(stamp.font) : undefined;
  let width = image?.width ?? 0;
  let height = image?.height ?? 0;
  let descent = 0;
  if (font) {
    if (!text) throw new Error('Enter watermark text.');
    try {
      width = font.widthOfTextAtSize(text, 1);
      height = font.heightAtSize(1);
      descent = height - font.heightAtSize(1, { descender: false });
    } catch {
      throw new Error('This font cannot display some characters. Try different text or upload an image of your watermark.');
    }
  }

  const color = 'color' in stamp ? stamp.color : '#000000';
  const ink = rgb(...([1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255) as [number, number, number]));
  const radians = options.angle * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  for (const page of document.getPages().slice(preview ? 0 : first - 1, preview ? 1 : last)) {
    const box = page.getCropBox();
    const angle = ((page.getRotation().angle % 360) + 360) % 360;
    const sideways = angle === 90 || angle === 270;
    const viewWidth = sideways ? box.height : box.width;
    const viewHeight = sideways ? box.width : box.height;
    const columns = options.repeat ? 3 : 1;
    const cellWidth = viewWidth / columns;
    const cellHeight = viewHeight / columns;
    const rotatedWidth = Math.abs(width * cos) + Math.abs(height * sin);
    const rotatedHeight = Math.abs(width * sin) + Math.abs(height * cos);
    const scale = Math.min(cellWidth * options.size / 100 / rotatedWidth, cellHeight * .8 / rotatedHeight);
    const halfWidth = rotatedWidth * scale / 2;
    const halfHeight = rotatedHeight * scale / 2;
    const inset = Math.min(cellWidth, cellHeight) * .06;
    const positions = options.repeat ? watermarkPositions.map((_, index) => index) : [options.position];

    for (const position of positions) {
      const col = position % 3;
      const row = Math.floor(position / 3);
      const centerX = options.repeat ? (col + .5) * cellWidth : [halfWidth + inset, viewWidth / 2, viewWidth - halfWidth - inset][col];
      const centerY = options.repeat ? (2.5 - row) * cellHeight : [viewHeight - halfHeight - inset, viewHeight / 2, halfHeight + inset][row];
      const dx = -width * scale / 2;
      const dy = (descent - height / 2) * scale;
      const x = centerX + dx * cos - dy * sin;
      const y = centerY + dx * sin + dy * cos;
      const [pdfX, pdfY] = angle === 90 ? [box.width - y, x]
        : angle === 180 ? [box.width - x, box.height - y]
        : angle === 270 ? [y, box.height - x] : [x, y];
      const placement = { x: box.x + pdfX, y: box.y + pdfY, rotate: degrees(angle + options.angle), opacity: options.opacity / 100 };
      if (image) page.drawImage(image, { ...placement, width: width * scale, height: height * scale });
      if (font) page.drawText(text, { ...placement, font, size: scale, color: ink });
    }

    // This document was freshly loaded or copied. Drawing adds one new stream
    // after the original, isolated page streams. Move only that stream below them.
    const contents = page.node.Contents();
    if (options.layer === 'under' && contents instanceof PDFArray && contents.size() > 1) {
      const lastIndex = contents.size() - 1;
      const watermark = contents.get(lastIndex);
      contents.remove(lastIndex);
      contents.insert(0, watermark);
    }
  }
  return document.save();
}

async function embedStamp(document: PDFDocument, image: File) {
  if (image.size > 10 * 1024 * 1024) throw new Error('Choose a watermark image up to 10 MB.');
  const bytes = new Uint8Array(await image.arrayBuffer());
  try {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await document.embedJpg(bytes);
    return await document.embedPng(bytes);
  } catch {
    throw new Error('Choose a valid PNG or JPEG image for the watermark.');
  }
}
