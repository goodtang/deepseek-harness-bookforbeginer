// SPDX-License-Identifier: Apache-2.0
/** Verify PowerShell arguments with spaced, Unicode, non-sibling repository aliases. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, symlink, unlink, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve, sep, parse } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

assert.equal(process.platform, 'win32', 'This author check verifies Windows PowerShell only');
assert.ok(process.argv[2]);
const here = dirname(fileURLToPath(import.meta.url));
await mkdir(join(here, '.lab-runtime'), { recursive: true });
const root = await mkdtemp(join(here, '.lab-runtime/reader-paths-'));
const external = await mkdtemp(join(tmpdir(), 'book-reader-paths-'));
const bookAlias = join(external, '学习 文档');
await mkdir(join(root, 'separate', 'tools'), { recursive: true });
const sourceAlias = join(root, 'separate', 'tools', '工程 实现');
const output = join(root, 'output');
const created = [];
let run;
try {
  for (const [target, alias] of [[resolve(here, '../..'), bookAlias], [resolve(process.argv[2]), sourceAlias]]) {
    await symlink(target, alias, 'junction'); created.push(alias);
  }
  run = spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', `
    $BookRoot = $env:BOOK_PATH_CHECK
    $HarnessRoot = $env:HARNESS_PATH_CHECK
    Set-Location -LiteralPath $BookRoot
    node (Join-Path $BookRoot 'labs/run-basics/check.mjs') $HarnessRoot
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Set-Location -LiteralPath $HarnessRoot
    node (Join-Path $BookRoot 'labs/observe-task/run.mjs') $HarnessRoot $env:BOOK_PATH_OUTPUT
    exit $LASTEXITCODE
  `], { encoding: 'utf8', windowsHide: true,
    env: { ...process.env, BOOK_PATH_CHECK: bookAlias, HARNESS_PATH_CHECK: sourceAlias, BOOK_PATH_OUTPUT: output } });
  if (run.error) throw run.error;
  assert.equal(run.status, 0, run.stderr);
  const evidence = JSON.parse(await readFile(join(output, 'run-evidence.json'), 'utf8'));
  assert.equal(evidence.passed, true);
  assert.equal(evidence.terminalStdout, 'Ticket lookup completed.\n');
  assert.ok(Object.values(evidence.cleanup).every(Boolean));
} finally {
  // Unlink only the exact junctions created here; never recursively remove their targets.
  for (const alias of created.reverse()) {
    assert.ok([root, external].some(owner => alias.startsWith(owner + sep)));
    await unlink(alias);
  }
}
const record = { platform: process.platform, capturedAt: new Date().toISOString(),
  scenario: 'PowerShell variables, spaces, Unicode and non-sibling directory aliases',
  setup: 'Junction aliases to existing prepared repositories, not fresh copies or installation',
  exitCode: run.status, actualObservationPassed: true, junctionsRemoved: true,
  bookPathRoot: parse(bookAlias).root, sourcePathRoot: parse(sourceAlias).root,
  distinctPathRoots: parse(bookAlias).root !== parse(sourceAlias).root,
  scriptSha256: createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),
  limits: 'Windows pwsh only; no Linux/macOS, empty machine setup or physical repository relocation tested', passed: true };
const destination = resolve(process.argv[3] ?? join(root, 'reader-paths.json'));
await writeFile(destination, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ passed: true, evidence: destination }));
