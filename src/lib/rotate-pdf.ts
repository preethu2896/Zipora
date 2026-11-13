import { degrees, type PDFDocument } from 'pdf-lib';

export function normalizeRotation(angle: number) {
  return ((angle % 360) + 360) % 360;
}

export async function saveRotatedPdf(document: PDFDocument, rotations: readonly number[]) {
  const pages = document.getPages();
  if (rotations.length !== pages.length || rotations.some(angle => !Number.isInteger(angle / 90))) {
    throw new Error('Choose a valid rotation for each page.');
  }
  pages.forEach((page, index) => {
    const delta = rotations[index];
    if (delta) page.setRotation(degrees(normalizeRotation(page.getRotation().angle + delta)));
  });
  return document.save();
}
