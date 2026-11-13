// One job per worker. The page terminates the worker after receiving the result.
self.onmessage = async ({ data: { file, password } }) => {
  try {
    const header = new TextDecoder('latin1').decode(await file.slice(0, 1024).arrayBuffer());
    if (!header.includes('%PDF-')) {
      self.postMessage({ error: 'Choose a valid PDF file.' });
      return;
    }
    self.importScripts('/qpdf/qpdf.js');
    const qpdf = await self.Module({
      locateFile: name => '/qpdf/' + name,
      print: () => {},
      printErr: () => {},
    });
    const ownerPassword = Array.from(self.crypto.getRandomValues(new Uint8Array(32)),
      byte => byte.toString(16).padStart(2, '0')).join('');
    qpdf.FS.mkdir('/in');
    qpdf.FS.mount(qpdf.WORKERFS, { blobs: [{ name: 'input.pdf', data: file }] }, '/in');
    const status = qpdf.callMain([
      '/in/input.pdf', '--encrypt', '--user-password=' + password,
      '--owner-password=' + ownerPassword, '--bits=256', '--', '/output.pdf',
    ]);
    if (status !== 0) throw new Error('qpdf did not complete successfully');
    const output = Uint8Array.from(qpdf.FS.readFile('/output.pdf'));
    self.postMessage({ bytes: output.buffer }, [output.buffer]);
  } catch {
    self.postMessage({ error: 'Could not protect this PDF. Try a valid, unlocked copy.' });
  }
};
