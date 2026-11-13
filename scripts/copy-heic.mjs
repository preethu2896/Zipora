import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const root = resolve(require.resolve('heic-to/csp'), '../../..');
const output = join(process.cwd(), 'public', 'heic');
mkdirSync(output, { recursive: true });
cpSync(join(root, 'dist', 'csp', 'heic-to.js'), join(output, 'decoder.mjs'));
cpSync(join(root, 'LICENSE'), join(output, 'LICENSE.txt'));
cpSync(join(root, 'README.md'), join(output, 'BUILD.md'));
