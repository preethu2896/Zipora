import { checkArchiveLimits, safeDownloadName } from '@/lib/archive-safety';
import type { ImageFormat } from './image-processing';

const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function rotatedImageName(file: File, format: ImageFormat, angle: number, index?: number) {
  const stem = file.name.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._-]/gu, '-').slice(0, 110) || 'image';
  const prefix = index === undefined ? '' : `${String(index + 1).padStart(2, '0')}-`;
  return `${prefix}${stem}${angle ? '-rotated' : ''}.${extensions[format]}`;
}

export async function rotateImagesZip(outputs: { blob: Blob; name: string }[]) {
  const { default: JSZip } = await import('jszip');
  checkArchiveLimits(outputs.length, outputs.reduce((total, output) => total + output.blob.size, 0));
  const zip = new JSZip();
  for (const output of outputs) zip.file(safeDownloadName(output.name), await output.blob.arrayBuffer());
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}
