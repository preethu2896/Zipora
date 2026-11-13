import JSZip from 'jszip';
import { Ream, WrongPasswordError } from 'reamkit';

self.onmessage = async ({ data: file }: MessageEvent<File>) => {
  try {
    const header = new TextDecoder().decode(await file.slice(0, 1024).arrayBuffer());
    if (!header.includes('%PDF-')) {
      self.postMessage({ error: 'Choose a valid PDF file.' });
      return;
    }
    const document = Ream.parse(new Uint8Array(await file.arrayBuffer()));
    const { bytes, losses } = await document.convertWithReport('docx');
    const archive = await JSZip.loadAsync(bytes);
    const body = await archive.file('word/document.xml')?.async('string');
    if (!body || !/<w:t(?:\s[^>]*)?>\s*[^\s<]/.test(body)) {
      self.postMessage({ error: 'No editable text found. Scanned pages need OCR before conversion.' });
      return;
    }
    const output = Uint8Array.from(bytes).buffer;
    self.postMessage({ bytes: output, hasChanges: losses.length > 0 }, { transfer: [output] });
  } catch (error) {
    self.postMessage({
      error: error instanceof WrongPasswordError
        ? 'This PDF needs a password. Unlock it first, then try again.'
        : 'Could not convert this PDF. Check that it opens in a PDF reader, then try again.',
    });
  }
};
