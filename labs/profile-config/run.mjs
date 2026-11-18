// SPDX-License-Identifier: Apache-2.0
/** Apply a second real CLI overlay, preserving raw reports before separate teaching acceptance. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspect } from './verify.mjs';

const [sourceArg, scenario, outputArg, exerciseArg] = process.argv.slice(2);
assert.ok(sourceArg && outputArg && exerciseArg, 'Usage: run.mjs <Harness-root> <scenario> <new-evidence> <exercise-directory>');
assert.ok(['memory', 'file', 'restored', 'typo', 'missing-path', 'bad-path', 'disabled', 'reader'].includes(scenario));
const source = resolve(sourceArg); const output = resolve(outputArg); const exercise = resolve(exerciseArg);
const here = dirname(fileURLToPath(import.meta.url));
const patch = join(exercise, `${scenario}.patch.yml`); const bytes = await readFile(patch);
await mkdir(dirname(output), { recursive: true }); await mkdir(output);
const loader = pathToFileURL(createRequire(join(source, 'package.json')).resolve('tsx/esm')).href;
const runtime = join(output, 'runtime');
const child = spawn(process.execPath, ['--import', loader, join(here, '../m1/run.mjs'), source, 'S1', runtime,
  join(here, 'entry.mjs'), 'full', patch], { cwd: source, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const out = []; const err = []; child.stdout.on('data', chunk => out.push(chunk)); child.stderr.on('data', chunk => err.push(chunk));
const [code] = await once(child, 'close');
await writeFile(join(output, 'runner-stdout.txt'), Buffer.concat(out)); await writeFile(join(output, 'runner-stderr.txt'), Buffer.concat(err));
const raw = await readFile(join(runtime, 'report.json')); const report = JSON.parse(raw);
assert.equal(report.extraPatch.sha256, createHash('sha256').update(bytes).digest('hex'));
assert.equal(report.watchdogExpired, false);
assert.deepEqual(report.cleanup, { mockServerClosed: true, childExited: true, temporaryRootRemoved: true });
let behavior;
if (['memory', 'file', 'restored', 'reader'].includes(scenario)) {
  assert.equal(code, 0); behavior = inspect(report, ['file', 'reader'].includes(scenario) ? 'file' : 'memory');
} else if (scenario === 'typo') {
  assert.equal(code, 0); inspect(report, 'memory'); assert.throws(() => inspect(report, 'file'));
  behavior = { expectedFileSelectionRejected: true, actualSource: 'memory', functionalPassed: report.functionalPassed, stderrWasEmpty: report.stderr === '' };
} else {
  assert.equal(code, 1); assert.equal(report.functionalPassed, false);
  const audit = report.executionAudit ?? [];
  assert.equal(audit.filter(row => row.type === 'execute').length, 0);
  assert.equal(audit.filter(row => row.type === 'provider-loaded').length, 0);
  if (scenario === 'missing-path') assert.ok(report.stderr.includes('File tickets require config.path.'));
  if (scenario === 'bad-path') assert.ok(report.stderr.includes('ENOENT'));
  if (scenario === 'disabled') assert.equal(audit.filter(row => row.type === 'config-selected').length, 0);
  behavior = { invalidCombinationRejected: true, toolExecutions: 0, functionalPassed: false };
}
const summary = { scenario, capturedAt: new Date().toISOString(), originalReportSha256: createHash('sha256').update(raw).digest('hex'),
  extraPatchSha256: report.extraPatch.sha256, runnerExitCode: code, applicationExitCode: report.applicationExitCode,
  ...behavior, cleanup: report.cleanup, networkIsolationVerified: false, readerAccepted: false };
await writeFile(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary));
