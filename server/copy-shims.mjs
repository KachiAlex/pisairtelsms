import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeModulesDir = path.resolve(__dirname, '..', 'node_modules');

const shims = [
  {
    src: path.resolve(__dirname, 'shims', '@vercel', 'postgres'),
    dest: path.resolve(nodeModulesDir, '@vercel', 'postgres'),
  },
  {
    src: path.resolve(__dirname, 'shims', '@vercel', 'node'),
    dest: path.resolve(nodeModulesDir, '@vercel', 'node'),
  },
];

for (const { src, dest } of shims) {
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src);
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
  console.log(`[shims] Installed ${path.relative(nodeModulesDir, dest)}`);
}

console.log('[shims] All shims installed successfully');
