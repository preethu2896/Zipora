import { PDFDocument } from 'pdf-lib';

export const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
export type PdfSource = { name: string; arrayBuffer(): Promise<ArrayBuffer> };
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(2)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
export function outputFilename(value: string) {
  const cleaned = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\.pdf$/i, '').replace(/[. ]+$/g, '').slice(0, 120);
  return `${cleaned || 'zipora-merged'}.pdf`;
}
export async function loadPdf(source: PdfSource) {
  try {
    const data = await source.arrayBuffer();
    const signature = new TextDecoder('latin1').decode(data.slice(0, 1024));
    if (!signature.includes('%PDF-')) throw new Error('invalid');
    const doc = await PDFDocument.load(data);
    if (!doc.getPageCount()) throw new Error('empty');
    return doc;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/encrypt/i.test(message)) throw new Error(`“${source.name}” is password-protected. Save an unlocked copy and try again.`);
    throw new Error(`“${source.name}” could not be read as a PDF. Try a valid, undamaged PDF.`);
  }
}
export async function inspectPdf(source: PdfSource) {
  return (await loadPdf(source)).getPageCount();
}
export async function mergePdfs(sources: PdfSource[], onProgress: (percent: number) => void = () => {}) {
  if (sources.length < 2) throw new Error('Choose at least two PDF files to merge.');
  const result = await PDFDocument.create();
  result.setProducer('Zipora');
  result.setCreator('Zipora');
  for (let index = 0; index < sources.length; index++) {
    const document = await loadPdf(sources[index]);
    const pages = await result.copyPages(document, document.getPageIndices());
    pages.forEach(page => result.addPage(page));
    onProgress(Math.round(((index + 1) / sources.length) * 90));
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  const bytes = await result.save();
  onProgress(100);
  return { bytes, pages: result.getPageCount() };
}
