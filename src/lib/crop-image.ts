import { canvasBlob, imageDimensions, type ImageFormat } from './image-processing';

export type CropRect = { x: number; y: number; width: number; height: number };

export function cropWithinImage(rect: CropRect, image: { width: number; height: number }) {
  const { x, y, width, height } = rect;
  return [x, y, width, height].every(Number.isSafeInteger)
    && x >= 0 && y >= 0 && width > 0 && height > 0
    && x + width <= image.width && y + height <= image.height;
}

export async function exportCrop(image: ImageBitmap, rect: CropRect, format: ImageFormat) {
  if (!cropWithinImage(rect, image)) throw new Error('Keep the crop rectangle inside the image.');
  const { width, height } = imageDimensions(rect.width, rect.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser cannot create images.');
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, rect.x, rect.y, width, height, 0, 0, width, height);
    return await canvasBlob(canvas, format, .95);
  } finally {
    canvas.width = canvas.height = 0;
  }
}
