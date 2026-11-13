import { canvasBlob } from './image-processing';

export function faviconPng(image: ImageBitmap, size: number, background?: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not render the icon.');
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);
  }
  const scale = size / Math.max(image.width, image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return canvasBlob(canvas, 'image/png');
}

export async function makeIco(frames: { size: number; png: Blob }[]) {
  const header = new DataView(new ArrayBuffer(6 + 16 * frames.length));
  header.setUint16(2, 1, true);
  header.setUint16(4, frames.length, true);
  let offset = header.byteLength;
  for (const [index, { size, png }] of frames.entries()) {
    const entry = 6 + 16 * index;
    header.setUint8(entry, size === 256 ? 0 : size);
    header.setUint8(entry + 1, size === 256 ? 0 : size);
    header.setUint16(entry + 4, 1, true);
    header.setUint16(entry + 6, 32, true);
    header.setUint32(entry + 8, png.size, true);
    header.setUint32(entry + 12, offset, true);
    offset += png.size;
  }
  return new Blob([header.buffer, ...frames.map(frame => frame.png)], { type: 'image/x-icon' });
}
