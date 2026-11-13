import { canvasBlob } from './image-processing';

export const maxHeicFiles = 12;
export const maxHeicFileBytes = 20 * 1024 * 1024;
export const maxHeicBatchBytes = 60 * 1024 * 1024;

export async function hasHeicHeader(file: File) {
  const buffer = await file.slice(0, 4096).arrayBuffer();
  if (buffer.byteLength < 16) return false;
  const data = new DataView(buffer);
  const read = (offset: number) => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
  if (read(4) !== 'ftyp') return false;
  const end = Math.min(data.getUint32(0), buffer.byteLength);
  const brands = [read(8)];
  for (let offset = 16; offset + 4 <= end; offset += 4) brands.push(read(offset));
  const heic = brands.some(brand => ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'].includes(brand));
  const generic = brands.some(brand => brand === 'mif1' || brand === 'msf1');
  return heic || (generic && !brands.some(brand => brand === 'avif' || brand === 'avis'));
}

type Decoder = { heicTo(options: { blob: Blob; type: 'bitmap' }): Promise<ImageBitmap> };
const decoderUrl = '/heic/decoder.mjs';
let decoder: Promise<Decoder> | undefined;

export async function convertHeic(file: File, quality: number) {
  decoder ??= import(/* webpackIgnore: true */ decoderUrl).catch(() => {
    decoder = undefined;
    throw new Error('The HEIC decoder could not load. Reload the page and try again.');
  });
  const { heicTo } = await decoder;
  let image: ImageBitmap;
  try {
    image = await heicTo({ blob: file, type: 'bitmap' });
  } catch {
    throw new Error(`Could not decode “${file.name}”. Try a valid HEIC or HEIF photo.`);
  }
  const canvas = document.createElement('canvas');
  try {
    const { width, height } = image;
    if (width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > 50_000_000) {
      throw new Error(`“${file.name}” exceeds the output limit of 50 megapixels or 8192 pixels per side.`);
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser cannot create this image.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0);
    return { blob: await canvasBlob(canvas, 'image/jpeg', quality), width, height };
  } finally {
    canvas.width = canvas.height = 0;
    image.close();
  }
}
