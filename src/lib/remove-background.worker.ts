import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm';

const size = 320;
const pixels = size * size;
const mean = [0.485, 0.456, 0.406];
const deviation = [0.229, 0.224, 0.225];
env.wasm.numThreads = 1;
env.wasm.wasmPaths = new URL('/background-runtime/', self.location.origin).href;

let model: Promise<InferenceSession> | undefined;

self.onmessage = async ({ data: file }: MessageEvent<File>) => {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    if (width * height > 16_000_000 || Math.max(width, height) > 8192) {
      self.postMessage({ error: 'Choose an image up to 16 megapixels and 8192 pixels per side.' });
      return;
    }
    const small = new OffscreenCanvas(size, size);
    const context = small.getContext('2d', { willReadFrequently: true })!;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size, size);
    context.drawImage(bitmap, 0, 0, size, size);
    const rgb = context.getImageData(0, 0, size, size).data;
    const input = new Float32Array(3 * pixels);
    let peak = 1;
    for (let i = 0; i < rgb.length; i += 4) peak = Math.max(peak, rgb[i], rgb[i + 1], rgb[i + 2]);
    for (let channel = 0; channel < 3; channel++) {
      for (let i = 0; i < pixels; i++) {
        input[channel * pixels + i] = (rgb[i * 4 + channel] / peak - mean[channel]) / deviation[channel];
      }
    }
    self.postMessage({ status: 'Loading background model…' });
    const session = await (model ??= InferenceSession.create(new URL('/models/u2netp/u2netp.onnx', self.location.origin).href, {
      executionProviders: ['wasm'],
    }).catch(error => { model = undefined; throw error; }));
    self.postMessage({ status: 'Separating the subject…' });
    const outputs = await session.run({ [session.inputNames[0]]: new Tensor('float32', input, [1, 3, size, size]) });
    const scores = outputs[session.outputNames[0]].data as Float32Array;
    if (scores.length !== pixels) throw new Error('Unexpected mask dimensions');
    let low = Infinity, high = -Infinity;
    for (const score of scores) { low = Math.min(low, score); high = Math.max(high, score); }
    if (!Number.isFinite(low) || high - low < 0.00001) {
      self.postMessage({ error: 'Could not identify a foreground subject. Try a photo with a clearer subject.' });
      return;
    }
    const mask = context.createImageData(size, size);
    for (let i = 0; i < pixels; i++) mask.data[4 * i + 3] = Math.round(255 * (scores[i] - low) / (high - low));
    context.putImageData(mask, 0, 0);
    const canvas = new OffscreenCanvas(width, height);
    const output = canvas.getContext('2d')!;
    output.drawImage(bitmap, 0, 0);
    output.globalCompositeOperation = 'destination-in';
    output.imageSmoothingQuality = 'high';
    output.drawImage(small, 0, 0, width, height);
    self.postMessage({ blob: await canvas.convertToBlob({ type: 'image/png' }) });
  } catch {
    self.postMessage({ error: 'Could not remove this background. Try a smaller image in an up-to-date browser.' });
  } finally {
    bitmap?.close();
  }
};
