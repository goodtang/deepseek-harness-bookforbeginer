// SPDX-License-Identifier: Apache-2.0
/** Replay chapter-three examples in temporary copies; preserve readers' exercise files and older evidence. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const book = resolve(here, '../..');
const chapterPath = 'chapters/第03章-写出并验证工单查询函数.md';
const files = {};
const contents = {};
const sha = value => createHash('sha256').update(value).digest('hex');
for (const path of [chapterPath, 'labs/func/starter.mjs', 'labs/func/completed.mjs',
  'labs/func/check.mjs', 'labs/func/check-one.mjs', 'labs/func/verify.mjs', 'labs/first-tool/tickets.mjs']) {
  const bytes = await readFile(join(book, path));
  files[path] = sha(bytes);
  contents[path] = bytes.toString('utf8');
}
const blocks = [...contents[chapterPath].matchAll(/```js\n([\s\S]*?)```/g)].map(match => match[1].trim());
const body = text => text.split('\n').slice(2).join('\n').trim();
const completed = contents['labs/func/completed.mjs'];
const firstCheck = contents['labs/func/check-one.mjs'];
assert.equal(blocks.length, 5, 'Review changed chapter snippets before replaying');
assert.equal(blocks[1], body(completed), 'Chapter completion differs from the runnable snapshot');
assert.equal(blocks[2], body(firstCheck), 'Chapter first assertion differs from the runnable file');

await mkdir(join(here, '.lab-runtime'), { recursive: true });
const output = process.argv[2] ? resolve(process.argv[2]) :
  join(here, '.lab-runtime', `verification-${Date.now()}`);
await mkdir(output); // Existing evidence is never overwritten.
const scratch = await mkdtemp(join(tmpdir(), 'book-func-'));
const cases = [];
const run = (name, script, target, expectedCode, expectedChecks) => {
  const args = target ? [script, target] : [script];
  const result = spawnSync(process.execPath, args, { cwd: book, encoding: 'utf8', windowsHide: true, timeout: 10000 });
  if (result.error) throw result.error;
  const entry = { name, command: ['node', ...args], expectedExitCode: expectedCode,
    observedExitCode: result.status, stdout: result.stdout, stderr: result.stderr,
    scriptSha256: sha(readFileSync(resolve(book, script))),
    targetSha256: sha(readFileSync(target ? resolve(book, target) : join(scratch, 'starter.mjs'))) };
  cases.push(entry);
  assert.equal(result.status, expectedCode, `${name}: ${result.stderr}`);
  if (expectedChecks) {
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.checks.map(check => check.passed), expectedChecks, name);
    assert.equal(report.passed, expectedChecks.every(Boolean), name);
  }
  return result;
};
const checker = 'labs/func/check.mjs';
let cleanup = false;
try {
  run('unfinished-starter', checker, 'labs/func/starter.mjs', 1, [false, true, false]);
  run('chapter-completed', checker, 'labs/func/completed.mjs', 0, [true, true, true]);
  const target = join(scratch, 'starter.mjs');
  const script = join(scratch, 'check-one.mjs');
  await writeFile(target, completed.replace('export function', 'function'));
  const noExport = run('missing-export', checker, target, 1);
  assert.ok(noExport.stderr.includes('没有找到导出的 lookupTicket'));

  await writeFile(target, completed);
  await writeFile(script, firstCheck);
  const first = run('first-assertion', script, undefined, 0);
  assert.equal(first.stdout, '状态检查通过\n');
  await writeFile(script, firstCheck.replace("assert.equal(ticket.status, 'open')", "assert.equal(ticket.status, 'closed')"));
  const wrong = run('deliberately-wrong-expectation', script, undefined, 1);
  assert.equal(wrong.stdout, '');
  assert.ok(wrong.stderr.includes("'open' !== 'closed'"));
  await writeFile(script, firstCheck);
  assert.equal(run('restored-expectation', script, undefined, 0).stdout, first.stdout);

  const expanded = firstCheck.replace("console.log('状态检查通过');", `${blocks[3]}\n${blocks[4]}\nconsole.log('状态检查通过');`);
  await writeFile(script, expanded);
  assert.equal(run('expanded-chapter-assertions', script, undefined, 0).stdout, first.stdout);
  await writeFile(target, completed.replace('return ticket ? { ...ticket } : null;', 'return ticket ? ticket : null;'));
  run('returning-original-object', checker, target, 1, [true, true, false]);

  await writeFile(target, completed.replace('const tickets = {',
    "const tickets = {\n  'TK-1043': { id: 'TK-1043', status: 'closed', title: 'Example extension' },"));
  await writeFile(script, firstCheck.replace("console.log('状态检查通过');",
    "assert.deepEqual(lookupTicket('TK-1043'), { id: 'TK-1043', status: 'closed', title: 'Example extension' });\nconsole.log('扩展检查通过');"));
  assert.equal(run('extension-example', script, undefined, 0).stdout, '扩展检查通过\n');
  run('extension-original-regression', checker, target, 0, [true, true, true]);
  run('later-tool-example-regression', checker, 'labs/first-tool/tickets.mjs', 0, [true, true, true]);
} finally {
  await rm(scratch, { recursive: true });
  try { await access(scratch); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    cleanup = true;
  }
}
assert.ok(cleanup);
await writeFile(join(output, 'checks.json'), `${JSON.stringify({
  chapter: 'CH-FUNC', capturedAt: new Date().toISOString(), node: process.version,
  platform: process.platform, arch: process.arch, files, cases,
  correspondence: 'Completion and first assertion match chapter code blocks; extra assertions replayed verbatim',
  scope: 'Pure teaching functions in temporary copies; no Harness/model run, cross-platform or reader acceptance',
  cleanup: { temporaryCopiesRemoved: cleanup }, passed: true,
}, null, 2)}\n`);
console.log(`Verified ${cases.length} cases; evidence: ${output}`);
