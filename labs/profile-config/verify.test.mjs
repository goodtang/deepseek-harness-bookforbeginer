// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspect } from './verify.mjs';
const path = process.env.BOOK_CONFIG_REPORT;
test('actual configured profile and misleading evidence', { skip: !path }, async t => {
  const report = JSON.parse(await readFile(path, 'utf8'));
  inspect(report, 'file');
  for (const [name, mutate] of [
    ['selected configuration ignored', r => { r.executionAudit.find(x => x.type === 'config-selected').source = 'memory'; }],
    ['provider differs from configuration', r => { r.executionAudit.filter(x => x.type === 'provider-query').at(-1).source = 'memory'; }],
    ['no completed service check', r => { r.executionAudit = r.executionAudit.filter(x => x.type !== 'service-check-passed'); }],
    ['tool did not execute', r => { r.executionAudit = r.executionAudit.filter(x => x.type !== 'execute'); }],
    ['no extra overlay captured', r => { delete r.extraPatch; }],
    ['cleanup incomplete', r => { r.cleanup.temporaryRootRemoved = false; }],
  ]) await t.test(name, () => { const r = structuredClone(report); mutate(r); assert.throws(() => inspect(r, 'file')); });
});
