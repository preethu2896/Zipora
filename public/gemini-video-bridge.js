// The pinned upstream browser bundle exposes the same controls used by its CLI.
const picker = document.getElementById('fileInput');
const processButton = document.getElementById('processBtn');
const status = document.getElementById('status');
const link = document.getElementById('downloadBtn');
const send = message => parent.postMessage(message, location.origin);
let started = false;
const observer = new MutationObserver(async () => {
  if (!started) return;
  if (status.dataset.tone === 'error') {
    started = false;
    send({ type: 'gemini-error' });
  } else if (status.dataset.tone === 'success' && link.href.startsWith('blob:') && link.getAttribute('aria-disabled') !== 'true') {
    started = false;
    try {
      const blob = await fetch(link.href).then(response => response.blob());
      send({ type: 'gemini-result', blob });
    } catch {
      send({ type: 'gemini-error' });
    }
  }
});
observer.observe(status, { attributes: true, childList: true, subtree: true });
observer.observe(link, { attributes: true });

addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'gemini-run' ||
      !(event.data.file instanceof File) || started) return;
  const transfer = new DataTransfer();
  transfer.items.add(event.data.file);
  picker.files = transfer.files;
  picker.dispatchEvent(new Event('change', { bubbles: true }));
  // Use the engine's frame cleanup without the optional ONNX denoiser.
  window.__gwrVideoOverrideDenoiseBackend = 'canvas-edge-denoise';
  started = true;
  processButton.click();
});
