// SPDX-License-Identifier: Apache-2.0
/** Verify five real scenarios, a restored plugin, and six independently altered evidence copies. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load, inspect } from './inspect.mjs';

assert.ok(process.argv[6], 'Usage: node verify.mjs <release> <cancel> <uncooperative> <restored> <S3> [new-summary.json]');
const inputs = await Promise.all(process.argv.slice(2, 7).map(load));
const expected = ['gate-release', 'gate-cancel', 'gate-uncooperative', 'gate-cancel', 'S3'];
const runs = inputs.map((input, index) => { assert.equal(input.report.scenario, expected[index]); return inspect(input); });
assert.equal(runs[0].pluginSha256, runs[1].pluginSha256);
assert.notEqual(runs[1].pluginSha256, runs[2].pluginSha256);
assert.equal(runs[1].pluginSha256, runs[3].pluginSha256, 'Restored plugin bytes differ');
const controls = [
  ['completed-instead-of-aborted', 1, copy => {
    copy.durable.find(row => row.type === 'turn/end').data.reason = { kind: 'completed' };
    copy.observed.find(row => row.event?.type === 'turn/end').event.data.reason = { kind: 'completed' };
  }],
  ['cancel-not-accepted', 1, copy => { copy.report.controlResponse.body.accepted = false; }],
  ['watchdog-is-not-user-cancel', 1, copy => { copy.report.watchdogExpired = true; }],
  ['business-query-after-cancel', 1, copy => { copy.report.executionAudit.push({ type: 'business-lookup', id: 'TK-1042' }); }],
  ['uncooperative-not-waiting', 2, copy => { copy.report.pendingAfterCancel.waiting = false; }],
  ['gate-cleanup-not-recorded', 1, copy => { copy.report.executionAudit = copy.report.executionAudit.filter(row => row.type !== 'gate-server-closed'); }],
];
const negatives = [];
for (const [name, index, mutate] of controls) {
  const copy = structuredClone(inputs[index]); mutate(copy);
  assert.throws(() => inspect(copy), assert.AssertionError, name);
  negatives.push({ name, rejected: true });
}
const codeSha256 = {};
for (const name of ['gate.mjs', 'inspect.mjs', 'verify.mjs', 'start/plugin.mjs', '../m1/run.mjs', '../m1/observer.mjs']) {
  codeSha256[name] = createHash('sha256').update(await readFile(new URL(name, import.meta.url))).digest('hex');
}
const result = { passed: true, sourceCommit: runs[0].sourceCommit, realRuns: runs,
  restoredPluginVerified: true, negativeControls: negatives, codeSha256,
  scope: 'Actual supported-profile runs; negative controls alter in-memory evidence only',
  readerAccepted: false, externalNetworkIsolationVerified: false };
if (process.argv[7]) await writeFile(process.argv[7], `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ passed: true, realRuns: 5, restoredPlugin: true, rejectedAlteredCopies: negatives.length }));
