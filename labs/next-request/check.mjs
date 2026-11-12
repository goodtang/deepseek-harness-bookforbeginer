// SPDX-License-Identifier: Apache-2.0
/** Demonstrate that the chapter's comparison rejects five altered evidence copies. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { basename } from 'node:path';
import { inspect, load } from './inspect.mjs';

assert.ok(process.argv[2], 'Usage: node check.mjs <S1-evidence-directory> [new-checks.json]');
const { report, rows, hashes } = await load(process.argv[2]);
inspect(report, rows);
const cases = [
  ['missing-wire-result', r => { for (const m of r.requestBodies[1].messages) m.content = m.content.filter(b => b.type !== 'tool_result'); }],
  ['wrong-call-id', r => { r.requestBodies[1].messages.flatMap(m => m.content).find(b => b.type === 'tool_result').tool_use_id = 'wrong'; }],
  ['wrong-wire-ticket', r => { const b = r.requestBodies[1].messages.flatMap(m => m.content).find(b => b.type === 'tool_result'); b.content[0].text = JSON.stringify({ id: 'TK-1042', status: 'closed', title: 'Invoice export failed' }); }],
  ['wrong-persisted-ticket', (_r, e) => { e.find(row => row.type === 'tool/result').data.message.content[0].text = 'null'; }],
  ['application-failed', r => { r.applicationExitCode = 1; }],
];
const outcomes = [];
for (const [name, mutate] of cases) {
  const copy = structuredClone(report); const saved = structuredClone(rows);
  mutate(copy, saved);
  let diagnostic;
  assert.throws(() => { try { inspect(copy, saved); } catch (error) { diagnostic = error.message; throw error; } }, assert.AssertionError);
  outcomes.push({ name, rejected: true, diagnostic });
}
const codeSha256 = {};
for (const url of [new URL('inspect.mjs', import.meta.url), new URL(import.meta.url)]) {
  const path = fileURLToPath(url);
  codeSha256[basename(path)] = createHash('sha256').update(await readFile(path)).digest('hex');
}
const result = { originalPassed: true, negativeControls: outcomes, inputSha256: hashes, codeSha256,
  scope: 'Mutations of in-memory evidence copies only; no injected Harness runtime faults' };
if (process.argv[3]) await writeFile(process.argv[3], `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ originalPassed: true, rejectedAlteredCopies: outcomes.length }));
