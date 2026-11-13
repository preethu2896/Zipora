import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const packageRoot = fileURLToPath(new URL('../node_modules/@pilio/gemini-watermark-remover/', import.meta.url));
const destination = 'public/gemini-runtime';
mkdirSync(destination, { recursive: true });
for (const asset of ['video-app.js', 'models', 'onnxruntime']) {
  cpSync(join(packageRoot, 'dist', asset), join(destination, asset), { recursive: true });
}
cpSync(join(packageRoot, 'LICENSE'), join(destination, 'LICENSE'));
const html = readFileSync(join(packageRoot, 'dist/video-preview.html'), 'utf8');
writeFileSync(join(destination, 'index.html'), html.replace(
  '<script src="video-app.js"></script>',
  '<script src="video-app.js"></script><script src="/gemini-video-bridge.js"></script>',
));
