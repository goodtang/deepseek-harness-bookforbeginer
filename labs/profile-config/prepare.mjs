// SPDX-License-Identifier: Apache-2.0
/** Create only a new reader-owned directory; patches refer to actual absolute paths. */
import assert from 'node:assert/strict';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
assert.ok(process.argv[2], 'Usage: prepare.mjs <new-exercise-directory>');
const root = resolve(process.argv[2]);
await mkdir(dirname(root), { recursive: true }); await mkdir(root);
await copyFile(new URL('../plugin-services/tickets.json', import.meta.url), join(root, 'tickets.json'));
const path = JSON.stringify(join(root, 'tickets.json').replaceAll('\\', '/'));
const patches = {
  memory: '- id: book-ticket-tool\n  config:\n    source: memory\n',
  file: `- id: book-ticket-tool\n  config:\n    source: file\n    path: ${path}\n`,
  typo: `- id: book-ticket-tools\n  config:\n    source: file\n    path: ${path}\n`,
  'missing-path': '- id: book-ticket-tool\n  config:\n    source: file\n',
  'bad-path': `- id: book-ticket-tool\n  config:\n    source: file\n    path: ${JSON.stringify(join(root, 'missing.json').replaceAll('\\', '/'))}\n`,
  disabled: '- id: book-ticket-tool\n  disabled: true\n',
};
patches.restored = patches.memory;
patches.reader = patches.memory;
for (const [name, text] of Object.entries(patches)) await writeFile(join(root, `${name}.patch.yml`), text);
console.log(JSON.stringify({ exercise: root, plugin: fileURLToPath(new URL('./entry.mjs', import.meta.url)) }));
