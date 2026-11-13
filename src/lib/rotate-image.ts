import { canvasBlob, imageDimensions, type ImageFormat } from './image-processing';

export async function exportRotatedImage(image: ImageBitmap, format: ImageFormat, angle: number) {
  const sideways = angle === 90 || angle === 270;
  const width = sideways ? image.height : image.width;
  const height = sideways ? image.width : image.height;
  imageDimensions(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not create the rotated image.');
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle * Math.PI / 180);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    return await canvasBlob(canvas, format, .95);
  } finally {
    canvas.width = canvas.height = 0;
  }
}
