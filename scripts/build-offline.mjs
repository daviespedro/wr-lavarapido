import { createHash } from 'node:crypto';
import { relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const files = (await readdir(dist, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name !== 'sw.js')
  .map(entry => relative(fileURLToPath(dist), join(entry.parentPath, entry.name)).split('\\').join('/'))
  .sort();
const hash = createHash('sha256');
const worker = await readFile(new URL('./offline-worker.js', import.meta.url), 'utf8');
hash.update(worker);
for (const file of files) hash.update(file).update(await readFile(new URL(file, dist)));
const cache = `wr-static-${hash.digest('hex').slice(0, 16)}`;
await writeFile(new URL('sw.js', dist), `const CACHE = ${JSON.stringify(cache)};\nconst FILES = ${JSON.stringify(files.map(file => '/' + file))};\n${worker}`);
