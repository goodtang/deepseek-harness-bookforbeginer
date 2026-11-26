// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspect } from './verify.mjs';
const path = process.env.BOOK_CLOSE_REPORT;
test('actual cancelled-after-commit evidence and misleading copies', { skip: !path }, async t => {
  const report = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(report.scenario, 'cancel-after'); inspect(report);
  for (const [name, mutate] of [
    ['pretend cancel rolled back', r => { r.finalBusiness.writeCount = 0; }],
    ['wrong confirmed call', r => { r.phases[0].events.find(e => e.type === 'approval/asked').data.callId = 'other'; }],
    ['wrong approval pair', r => { r.phases[0].events.find(e => e.type === 'approval/decided').data.id = 'other'; }],
    ['different confirmed command', r => { r.phases[0].audit.find(e => e.type === 'write-planned').command.id = 'TK-9999'; }],
    ['cancel relabeled completion', r => { r.phases[0].events.find(e => e.type === 'turn/end').data.reason.kind = 'completed'; }],
    ['commit not observed before cancel', r => { r.phases[0].committedBeforeCancel.writeCount = 0; }],
    ['receipt never checked', r => { r.phases[0].reconciled.state = 'unknown'; }],
    ['cleanup incomplete', r => { r.cleanup.rootRemoved = false; }],
  ]) await t.test(name, () => { const r = structuredClone(report); mutate(r); assert.throws(() => inspect(r)); });
});
