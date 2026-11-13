// A separate worker for each attempt keeps the password and input out of later jobs.
self.onmessage = async ({ data: { file, password } }) => {
  const invalidPdf = 'Could not unlock this PDF. Check that it opens in a PDF reader.';
  let error = 'The PDF engine could not start. Reload and try again.';
  try {
    self.importScripts('/qpdf/qpdf.js');
    let passwordRejected = false;
    const originalError = console.error;
    let qpdf;
    try {
      // This qpdf WASM build binds the worker console during initialization.
      console.error = message => { passwordRejected ||= /invalid password/i.test(message); };
      qpdf = await self.Module({ locateFile: name => '/qpdf/' + name });
    } finally {
      console.error = originalError;
    }
    error = invalidPdf;
    qpdf.FS.mkdir('/in');
    qpdf.FS.mount(qpdf.WORKERFS, { blobs: [{ name: 'input.pdf', data: file }] }, '/in');
    let status;
    try {
      status = qpdf.callMain(['/in/input.pdf', '--password=' + password, '--decrypt', '/output.pdf']);
    } catch (cause) {
      if (!passwordRejected) throw cause;
    }
    if (passwordRejected) {
      self.postMessage({ error: 'Enter the correct PDF password and try again.', needsPassword: true });
      return;
    }
    // qpdf exit code 3 means the output was written with warnings.
    if (status !== 0 && status !== 3) throw new Error('qpdf failed');
    const bytes = Uint8Array.from(qpdf.FS.readFile('/output.pdf'));
    self.postMessage({ bytes: bytes.buffer }, [bytes.buffer]);
  } catch {
    self.postMessage({ error });
  }
};
