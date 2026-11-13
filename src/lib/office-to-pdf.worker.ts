import { Ream, WrongPasswordError } from 'reamkit';

async function loadFont(name: string) {
  const response = await fetch(`/pdfjs/standard_fonts/LiberationSans-${name}.ttf`);
  if (!response.ok) throw new Error('Font unavailable');
  return new Uint8Array(await response.arrayBuffer());
}

self.onmessage = async ({ data: file }: MessageEvent<File>) => {
  const isExcel = /\.xlsx?$/i.test(file.name);
  const formats = isExcel ? ['xlsx', 'xls'] : ['docx', 'doc'];
  try {
    const document = Ream.parse(new Uint8Array(await file.arrayBuffer()));
    if (!formats.includes(document.format)) {
      self.postMessage({ error: isExcel
        ? 'Choose an Excel workbook in .xlsx or .xls format.'
        : 'Choose a Word document in .docx or .doc format.' });
      return;
    }

    const [regular, bold, italic, boldItalic] = await Promise.all(
      ['Regular', 'Bold', 'Italic', 'BoldItalic'].map(loadFont),
    );
    const { bytes, losses } = await document.convertWithReport('pdf', {
      fonts: { regular, bold, italic, boldItalic },
    });
    const output = Uint8Array.from(bytes).buffer;
    self.postMessage({ bytes: output, hasChanges: losses.length > 0 }, { transfer: [output] });
  } catch (error) {
    const application = isExcel ? 'Excel' : 'Word';
    const input = isExcel ? 'workbook' : 'document';
    self.postMessage({
      error: error instanceof WrongPasswordError
        ? `Open the ${input} in ${application} and save an unlocked copy before converting.`
        : `Could not convert this ${input}. Check that it opens in ${application}, then try again.`,
    });
  }
};
