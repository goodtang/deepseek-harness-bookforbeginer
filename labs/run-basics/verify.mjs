// SPDX-License-Identifier: Apache-2.0
/** Exercise real caller-directory failures and the supported observation path. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

assert.ok(process.argv[2], 'Usage: node labs/run-basics/verify.mjs <source-root> [evidence-directory]');
const here = dirname(fileURLToPath(import.meta.url));
const book = resolve(here, '../..');
const source = resolve(process.argv[2]);
await mkdir(join(here, '.lab-runtime'), { recursive: true });
const runtime = await mkdtemp(join(here, '.lab-runtime/run-'));
const output = resolve(process.argv[3] ?? join(runtime, 'evidence'));
await mkdir(output, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const cases = [];
const run = (name, args, cwd, expectedCode) => {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  assert.equal(result.status, expectedCode, `${name}: ${result.stderr}`);
  cases.push({ name, expectedExitCode: expectedCode, observedExitCode: result.status });
  return result;
};

const preflight = run('source-preflight', ['labs/run-basics/check.mjs', source], book, 0);
await writeFile(join(output, 'preflight-stdout.txt'), preflight.stdout);
const wrongDirectory = run('relative-script-from-wrong-directory', ['labs/run-basics/check.mjs', source], source, 1);
assert.ok(wrongDirectory.stderr.includes('MODULE_NOT_FOUND'));
cases.at(-1).diagnostic = 'MODULE_NOT_FOUND';
const wrongSource = run('missing-source-directory', ['labs/run-basics/check.mjs', join(runtime, 'not-a-source')], book, 1);
assert.ok(wrongSource.stderr.includes('package.json'));
cases.at(-1).diagnostic = wrongSource.stderr.trim();
const absoluteCheck = run('absolute-script-from-source-directory', [join(here, 'check.mjs'), source], source, 0);
assert.equal(absoluteCheck.stdout, preflight.stdout);

for (const [name, cwd, script] of [
  ['relative-observation-from-book', book, 'labs/observe-task/run.mjs'],
  ['absolute-observation-from-source', source, join(book, 'labs/observe-task/run.mjs')],
]) {
  const destination = join(runtime, name);
  run(name, [script, source, destination], cwd, 0);
  const raw = await readFile(join(destination, 'run-evidence.json'));
  const evidence = JSON.parse(raw);
  assert.equal(evidence.passed, true);
  assert.equal(evidence.terminalStdout, 'Ticket lookup completed.\n');
  assert.equal(evidence.requests.length, 2);
  assert.ok(Object.values(evidence.cleanup).every(Boolean));
  const filename = `${name}.json`;
  await writeFile(join(output, filename), raw);
  Object.assign(cases.at(-1), { evidence: filename, sha256: sha(raw), applicationCleanup: evidence.cleanup });
}

const files = {};
for (const name of ['check.mjs', 'verify.mjs']) files[name] = sha(await readFile(join(here, name)));
const sourcePackage = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
await writeFile(join(output, 'checks.json'), `${JSON.stringify({
  chapter: 'CH-RUN', capturedAt: new Date().toISOString(), node: process.version,
  platform: process.platform, arch: process.arch, files, cases,
  sourceDeclaredNode: sourcePackage.engines.node, sourceDeclaredPackageManager: sourcePackage.packageManager,
  scope: 'Existing prepared source environment; no fresh installation, dependency rebuild, network isolation or cross-platform acceptance',
  retainedEvidence: 'Application temporary roots cleaned by inner runner; this verifier retains its own local evidence directories',
  passed: true,
}, null, 2)}\n`);
console.log(JSON.stringify({ passed: true, scenarios: cases.length, evidence: output }));
