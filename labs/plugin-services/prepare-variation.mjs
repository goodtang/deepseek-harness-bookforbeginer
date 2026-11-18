// SPDX-License-Identifier: Apache-2.0
/** Change and restore only an owned JSON copy, keeping input and expectation snapshots for each phase. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { baseTicket } from './service-checks.mjs';

assert.ok(process.argv[2] && process.argv[3], 'Usage: prepare-variation.mjs <exercise-directory> <baseline|changed|restored>');
const root = resolve(process.argv[2]); const phase = process.argv[3];
assert.ok(['baseline', 'changed', 'restored'].includes(phase));
const sha = data => createHash('sha256').update(data).digest('hex');
const dataPath = join(root, 'tickets.json'); const statePath = join(root, 'variation.json');
let original;
if (phase === 'baseline') {
  await mkdir(dirname(root), { recursive: true }); await mkdir(root);
  original = await readFile(new URL('./tickets.json', import.meta.url));
  await writeFile(join(root, 'original.json'), original);
} else {
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  assert.equal(state.kind, 'book-ticket-data-variation-v1');
  assert.equal(state.phase, phase === 'changed' ? 'baseline' : 'changed');
  assert.equal(sha(await readFile(dataPath)), state.currentSha256, 'Preserve unexpected edits before advancing');
  original = await readFile(join(root, 'original.json'));
  assert.equal(sha(original), state.originalSha256);
}
const expected = { ...baseTicket, title: phase === 'changed' ? 'Invoice export failed [JSON source changed]' : baseTicket.title };
const data = phase === 'changed' ? Buffer.from(JSON.stringify([expected], null, 2) + '\n') : original;
await writeFile(dataPath, data); await writeFile(join(root, `${phase}-tickets.json`), data);
const entry = `// SPDX-License-Identifier: Apache-2.0
import * as Provider from '${new URL('./file-provider.mjs', import.meta.url).href}';
import { mount } from '${new URL('./composition.mjs', import.meta.url).href}';
export const inject = ['tools'];
export async function apply(ctx) {
  await mount(ctx, Provider, {path: ${JSON.stringify(dataPath)}}, undefined, ${JSON.stringify(expected)});
}
`;
await writeFile(join(root, 'entry.mjs'), entry); await writeFile(join(root, `${phase}-entry.mjs`), entry);
await writeFile(statePath, JSON.stringify({ kind: 'book-ticket-data-variation-v1', phase, expected,
  originalSha256: sha(original), currentSha256: sha(data), entrySha256: sha(Buffer.from(entry)) }, null, 2) + '\n');
console.log(JSON.stringify({ phase, dataPath, entry: join(root, 'entry.mjs'), expectedTitle: expected.title }));
