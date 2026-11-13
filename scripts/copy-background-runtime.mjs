import { copyFileSync, mkdirSync } from 'node:fs';

const source = 'node_modules/onnxruntime-web';
const target = 'public/background-runtime';
mkdirSync(target, { recursive: true });
for (const name of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  copyFileSync(`${source}/dist/${name}`, `${target}/${name}`);
}
