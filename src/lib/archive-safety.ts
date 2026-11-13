export function safeDownloadName(name: string) {
  return name.replace(/\.\.[/\\]/g, '').replace(/[/\\\u0000-\u001f\u007f]/g, '').trim() || 'zipora-download';
}

export function checkArchiveLimits(count: number, bytes: number) {
  if (count > 250 || bytes > 200 * 1024 * 1024) {
    throw new Error('This ZIP exceeds 250 files or 200 MB uncompressed. Use a smaller batch.');
  }
}

export async function checkOfficeArchive(file: File) {
  const tail = await file.slice(-65_557).arrayBuffer();
  const end = new DataView(tail);
  for (let offset = end.byteLength - 22; offset >= 0; offset--) {
    if (end.getUint32(offset, true) !== 0x06054b50 ||
        offset + 22 + end.getUint16(offset + 20, true) !== end.byteLength) continue;
    const count = end.getUint16(offset + 10, true);
    const size = end.getUint32(offset + 12, true);
    const start = end.getUint32(offset + 16, true);
    checkArchiveLimits(count, size);
    if (size > 2 * 1024 * 1024 || start + size > file.size) break;
    const directory = new DataView(await file.slice(start, start + size).arrayBuffer());
    let cursor = 0;
    let bytes = 0;
    for (let index = 0; index < count; index++) {
      if (cursor + 46 > size || directory.getUint32(cursor, true) !== 0x02014b50) {
        throw new Error('This Office archive is invalid.');
      }
      bytes += directory.getUint32(cursor + 24, true);
      checkArchiveLimits(count, bytes);
      cursor += 46 + directory.getUint16(cursor + 28, true) + directory.getUint16(cursor + 30, true) + directory.getUint16(cursor + 32, true);
    }
    if (cursor === size) return;
    break;
  }
  throw new Error('This Office archive is invalid or uses an unsupported ZIP format.');
}
