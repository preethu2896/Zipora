export const maxUuidCount = 1000;

export function generateUuids(count: number): string[] {
  if (!Number.isInteger(count) || count < 1 || count > maxUuidCount) {
    throw new Error(`Enter a whole number from 1 to ${maxUuidCount}.`);
  }
  const random = crypto.getRandomValues(new Uint8Array(count * 16));
  return Array.from({ length: count }, (_, index) => {
    const bytes = random.subarray(index * 16, (index + 1) * 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  });
}
