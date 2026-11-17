import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const maxLogoBytes = 512 * 1024;

export class BookingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function verifyWebhook(body, headers, secret, now = Date.now()) {
  const id = headers['webhook-id'];
  const timestamp = headers['webhook-timestamp'];
  const signature = headers['webhook-signature'];
  if (!id || !/^\d+$/.test(timestamp ?? '') || !signature || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.`).update(body).digest();
  return signature.split(' ').some(entry => {
    const [version, encoded] = entry.split(',');
    if (version !== 'v1' || !encoded) return false;
    const actual = Buffer.from(encoded, 'base64');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export async function validateSubmission(form) {
  const field = (name, limit) => {
    const value = form.get(name);
    if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) throw new BookingError(400, `Check the ${name} field.`);
    return value.trim();
  };
  const frame = Number(field('frame', 2));
  if (!Number.isInteger(frame) || frame < 1 || frame > 12) throw new BookingError(400, 'Choose a frame from 1 to 12.');
  const brand = field('brand', 16);
  const tagline = field('tagline', 25);
  const link = field('link', 2048);
  const url = URL.canParse(link) ? new URL(link) : null;
  if (!url || url.protocol !== 'https:' || url.username || url.password) throw new BookingError(400, 'Enter a valid HTTPS website URL.');
  const email = field('email', 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BookingError(400, 'Enter a valid email address.');
  const notes = String(form.get('notes') ?? '').trim();
  if (notes.length > 1000) throw new BookingError(400, 'Keep notes under 1,000 characters.');
  const logo = form.get('logo');
  if (!(logo instanceof File) || !logo.size || logo.size > maxLogoBytes) throw new BookingError(400, 'Choose a PNG, JPG or WebP logo up to 512 KB.');
  const bytes = Buffer.from(await logo.arrayBuffer());
  const extension = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ? 'png'
    : bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')) ? 'jpg'
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
  if (!extension) throw new BookingError(400, 'Choose a valid PNG, JPG or WebP logo.');
  return { frame, brand, tagline, link: url.href, email, notes, bytes, extension };
}
