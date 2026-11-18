// SPDX-License-Identifier: Apache-2.0
/** Create an exclusive reader directory and relocate imports without assuming either checkout's name. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert.ok(process.argv[2], 'Usage: prepare-reader.mjs <new-exercise-directory>');
const target = resolve(process.argv[2]);
await mkdir(dirname(target), { recursive: true }); await mkdir(target);
const template = new URL('./reader-start.mjs', import.meta.url);
const code = (await readFile(template, 'utf8')).replace(/from '(\.\/[^']+)'/g,
  (_all, relative) => `from '${new URL(relative, template).href}'`);
await writeFile(join(target, 'provider.mjs'), code);
await writeFile(join(target, 'tickets.json'), await readFile(new URL('./tickets.json', import.meta.url)));
const composition = new URL('./composition.mjs', import.meta.url).href;
const entry = `// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from 'node:url';
import * as Provider from './provider.mjs';
import { mount } from '${composition}';
export const name = 'book-reader-composition';
export const inject = ['tools'];
export async function apply(ctx) {
  await mount(ctx, Provider, { path: fileURLToPath(new URL('./tickets.json', import.meta.url)) });
}
`;
await writeFile(join(target, 'entry.mjs'), entry);
console.log(JSON.stringify({ provider: join(target, 'provider.mjs'), entry: join(target, 'entry.mjs') }));
