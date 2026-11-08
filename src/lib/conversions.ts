import { PDFDocument } from 'pdf-lib';
import { inspectPdf, type PdfSource } from './pdf';

export type ImageSource = PdfSource & { type?: string };
export type ImagePageSize = 'a4' | 'letter' | 'original';
export const MAX_RENDER_PIXELS = 16_000_000;
export const MAX_EXPORT_PAGES = 150;
export const MAX_OUTPUT_BYTES = 200 * 1024 * 1024;
export const COMPRESSION_DPI = 150;
export const COMPRESSION_SCALE = COMPRESSION_DPI / 72;
const READABLE_JPEG_QUALITIES = [.85, .75, .65];

async function embedImage(document: PDFDocument, source: ImageSource) {
  const bytes = new Uint8Array(await source.arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return document.embedJpg(bytes);
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return document.embedPng(bytes);
  throw new Error(`“${source.name}” is not a supported image. Choose a valid JPG or PNG.`);
}
export async function inspectImage(source: ImageSource) {
  try {
    const image = await embedImage(await PDFDocument.create(), source);
    if (!image.width || !image.height || image.width * image.height > 40_000_000) throw new Error('too large');
    return { width: image.width, height: image.height };
  } catch {
    throw new Error(`“${source.name}” could not be read. Use a valid JPG or PNG up to 40 megapixels.`);
  }
}
export async function imagesToPdf(sources: ImageSource[], options: { pageSize: ImagePageSize; margin: number }, progress = (_percent: number) => {}) {
  if (!sources.length) throw new Error('Choose at least one JPG or PNG.');
  const document = await PDFDocument.create();
  document.setCreator('Zipora');
  for (let index = 0; index < sources.length; index++) {
    const image = await embedImage(document, sources[index]);
    const [width, height] = options.pageSize === 'original' ? [image.width, image.height] : options.pageSize === 'letter' ? [612, 792] : [595.28, 841.89];
    const margin = options.pageSize === 'original' ? 0 : Math.min(48, Math.max(0, options.margin));
    const scale = Math.min((width - margin * 2) / image.width, (height - margin * 2) / image.height, 1);
    const page = document.addPage([width, height]);
    page.drawImage(image, { x: (width - image.width * scale) / 2, y: (height - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
    progress(Math.round(((index + 1) / sources.length) * 90));
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  const bytes = await document.save();
  progress(100);
  return { bytes, pages: sources.length };
}
export async function optimizePdf(source: PdfSource, progress = (_percent: number) => {}) {
  await inspectPdf(source);
  const original = new Uint8Array(await source.arrayBuffer());
  const document = await PDFDocument.load(original, { updateMetadata: false });
  progress(40);
  await new Promise(resolve => setTimeout(resolve, 0));
  document.setTitle(''); document.setAuthor(''); document.setSubject(''); document.setKeywords([]);
  const candidate = await document.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
  // Rebuild the page tree too: a plain save can retain unreachable objects from earlier edits.
  const rebuilt = await PDFDocument.create();
  (await rebuilt.copyPages(document, document.getPageIndices())).forEach(page => rebuilt.addPage(page));
  const cleaned = await rebuilt.save({ useObjectStreams: true });
  let bytes: Uint8Array = original;
  for (const option of [candidate, cleaned]) if (option.length < bytes.length) bytes = option;
  progress(100);
  return { bytes, pages: document.getPageCount(), originalSize: original.length, savedPercent: (1 - bytes.length / original.length) * 100, strategy: bytes === original ? 'original' as const : 'optimized' as const };
}

async function openRenderedPdf(source: PdfSource) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  const task = pdfjs.getDocument({ data: new Uint8Array(await source.arrayBuffer()), standardFontDataUrl: '/pdfjs/standard_fonts/', cMapUrl: '/pdfjs/cmaps/', cMapPacked: true, wasmUrl: '/pdfjs/wasm/', isEvalSupported: false });
  try { return await task.promise; }
  catch (error) {
    await task.destroy();
    if (error instanceof Error && /password/i.test(error.message)) throw new Error('This PDF is password-protected. Save an unlocked copy first.');
    throw new Error('Could not render this PDF. Check that it is valid and unlocked.');
  }
}
async function renderPage(document: Awaited<ReturnType<typeof openRenderedPdf>>, pageNumber: number, scale: number, quality: number, format = 'image/jpeg', minimumDpi = 0) {
  const page = await document.getPage(pageNumber);
  const native = page.getViewport({ scale: 1 });
  const boundedScale = Math.min(scale, Math.sqrt(MAX_RENDER_PIXELS / (native.width * native.height)), 8192 / Math.max(native.width, native.height));
  if (minimumDpi && boundedScale * 72 < minimumDpi - .001) {
    page.cleanup();
    throw new Error(`This page exceeds browser rendering limits at ${minimumDpi} DPI. Use text-preserving compression or smaller page dimensions.`);
  }
  const viewport = page.getViewport({ scale: boundedScale });
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.max(1, minimumDpi ? Math.ceil(viewport.width) : Math.round(viewport.width));
  canvas.height = Math.max(1, minimumDpi ? Math.ceil(viewport.height) : Math.round(viewport.height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser cannot create images. Try a current browser.');
  try {
    await page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' }).promise;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create an image. Try a smaller PDF.')), format, quality));
    return { blob, width: canvas.width, height: canvas.height, pageWidth: native.width, pageHeight: native.height };
  } finally { canvas.width = 0; canvas.height = 0; page.cleanup(); }
}
export async function pdfToJpg(source: PdfSource, options: { scale: number; quality: number; format?: 'image/png' | 'image/jpeg' }, progress = (_percent: number) => {}) {
  const document = await openRenderedPdf(source);
  const images: { blob: Blob; name: string; width: number; height: number }[] = [];
  let total = 0;
  try {
    if (document.numPages > MAX_EXPORT_PAGES) throw new Error(`Use a PDF with ${MAX_EXPORT_PAGES} pages or fewer for image conversion.`);
    for (let index = 1; index <= document.numPages; index++) {
      const result = await renderPage(document, index, options.scale, options.quality, options.format);
      total += result.blob.size;
      if (total > MAX_OUTPUT_BYTES) throw new Error('The generated images exceed 200 MB. Choose a lower resolution or use a smaller PDF.');
      images.push({ blob: result.blob, name: `page-${String(index).padStart(3, '0')}.${options.format === 'image/png' ? 'png' : 'jpg'}`, width: result.width, height: result.height });
      progress(Math.round((index / document.numPages) * 100));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return images;
  } finally { await document.destroy(); }
}
export async function compressAsImages(source: PdfSource, quality: number, progress = (_percent: number) => {}) {
  const optimized = await optimizePdf(source, value => progress(Math.round(value * .1)));
  const { originalSize } = optimized;
  const document = await openRenderedPdf(source);
  const result = await PDFDocument.create();
  // Change JPEG encoding quality, never physical resolution. Even Strong stays at 150 DPI.
  const tiers = (quality < .6 ? READABLE_JPEG_QUALITIES : [.9, .85, .75]).map(quality => ({ scale: COMPRESSION_SCALE, quality }));
  try {
    if (document.numPages > MAX_EXPORT_PAGES) throw new Error(`Use ${MAX_EXPORT_PAGES} pages or fewer for strong compression.`);
    let total = 0;
    for (let index = 1; index <= document.numPages; index++) {
      const targetBytes = originalSize / document.numPages * .75;
      let page: Awaited<ReturnType<typeof renderPage>> | undefined;
      for (let tierIndex = 0; tierIndex < tiers.length; tierIndex++) {
        const tier = tiers[tierIndex];
        const candidate = await renderPage(document, index, tier.scale, tier.quality, 'image/jpeg', COMPRESSION_DPI);
        if (!page || candidate.blob.size < page.blob.size) page = candidate;
        progress(10 + Math.round(((index - 1 + (tierIndex + 1) / tiers.length) / document.numPages) * 80));
        if (page.blob.size <= targetBytes) break;
      }
      if (!page) throw new Error('Could not compress this page.');
      total += page.blob.size;
      if (total > MAX_OUTPUT_BYTES) { progress(100); return optimized; }
      const image = await result.embedJpg(await page.blob.arrayBuffer());
      result.addPage([page.pageWidth, page.pageHeight]).drawImage(image, { x: 0, y: 0, width: page.pageWidth, height: page.pageHeight });
      progress(10 + Math.round((index / document.numPages) * 80));
    }
    const bytes = await result.save();
    progress(100);
    if (bytes.length >= optimized.bytes.length) return optimized;
    return { bytes, pages: document.numPages, originalSize, savedPercent: (1 - bytes.length / originalSize) * 100, strategy: 'image' as const, dpi: COMPRESSION_DPI };
  } finally { await document.destroy(); }
}
export async function zipImages(images: { blob: Blob; name: string }[]) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const image of images) zip.file(image.name, await image.blob.arrayBuffer());
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

export async function compressPdfToTarget(source: PdfSource, target: number, raster: boolean, progress = (_value:number)=>{}) {
  if (!Number.isFinite(target) || target<1024) throw new Error('Choose a valid target size.');
  const optimized = await optimizePdf(source);
  let best: {bytes:Uint8Array;pages:number;strategy:string;dpi?:number} = optimized;
  if (best.bytes.length<=target || !raster) { progress(100); return {...best,targetMet:best.bytes.length<=target,originalSize:optimized.originalSize}; }
  const doc=await openRenderedPdf(source);
  try {
    if(doc.numPages>MAX_EXPORT_PAGES) throw new Error('Image-based compression supports up to 150 pages.');
    const tiers=READABLE_JPEG_QUALITIES.map(quality=>({scale:COMPRESSION_SCALE,quality}));
    for(let tier=0;tier<tiers.length;tier++) {
      const output=await PDFDocument.create();let total=0;
      for(let index=1;index<=doc.numPages;index++) {
        const page=await renderPage(doc,index,tiers[tier].scale,tiers[tier].quality,'image/jpeg',COMPRESSION_DPI);total+=page.blob.size;
        if(total>MAX_OUTPUT_BYTES) break;
        const image=await output.embedJpg(await page.blob.arrayBuffer());
        output.addPage([page.pageWidth,page.pageHeight]).drawImage(image,{x:0,y:0,width:page.pageWidth,height:page.pageHeight});
        progress(Math.round(((tier+(index/doc.numPages))/tiers.length)*95));
      }
      if(output.getPageCount()!==doc.numPages)continue;
      const bytes=await output.save();if(bytes.length<best.bytes.length)best={bytes,pages:doc.numPages,strategy:'image',dpi:COMPRESSION_DPI};
      if(best.bytes.length<=target)break;
    }
    progress(100);return {...best,targetMet:best.bytes.length<=target,originalSize:optimized.originalSize};
  } catch(error) {
    if(error instanceof Error && error.message.includes('exceeds browser rendering limits')) {
      progress(100);
      return {...best,targetMet:best.bytes.length<=target,originalSize:optimized.originalSize,rasterUnavailable:error.message};
    }
    throw error;
  } finally {await doc.destroy();}
}
