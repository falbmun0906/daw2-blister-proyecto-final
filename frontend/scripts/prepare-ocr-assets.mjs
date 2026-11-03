import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'public/ocr/tesseract-7');
await mkdir(destination, { recursive: true });
const tesseract = path.dirname(require.resolve('tesseract.js/package.json'));
const core = path.dirname(require.resolve('tesseract.js-core/package.json'));
await copyFile(path.join(tesseract, 'dist/worker.min.js'), path.join(destination, 'worker.min.js'));
for (const file of await readdir(core)) {
  if (/^tesseract-core.*\.wasm(?:\.js)?$/.test(file))
    await copyFile(path.join(core, file), path.join(destination, file));
}
for (const language of ['spa', 'eng']) {
  const directory = path.dirname(require.resolve(`@tesseract.js-data/${language}/package.json`));
  await copyFile(
    path.join(directory, '4.0.0_best_int', `${language}.traineddata.gz`),
    path.join(destination, `${language}.traineddata.gz`),
  );
}
console.log('OCR assets prepared for same-origin processing.');
