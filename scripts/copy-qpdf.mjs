import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = dirname(require.resolve('@soulehshaikh99/qpdf-wasm/package.json'));
const output = join(process.cwd(), 'public', 'qpdf');
mkdirSync(output, { recursive: true });
for (const name of ['qpdf.js', 'qpdf.wasm']) cpSync(join(root, 'dist', name), join(output, name));
cpSync(join(root, 'LICENSE'), join(output, 'ISC-LICENSE.txt'));
