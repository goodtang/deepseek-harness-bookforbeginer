// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspect } from './verify.mjs';

const path = process.env.BOOK_PLUGIN_REPORT;
test('lifecycle evidence accepts the real run and rejects misleading copies', { skip: !path }, async t => {
  const report = JSON.parse(await readFile(path, 'utf8'));
  inspect(report, 'file', true);
  const changes = [
    ['provider was not replaced', row => { row.executionAudit.find(item => item.type === 'provider-query').source = 'memory'; }],
    ['old tool remains registered', row => { row.executionAudit.find(item => item.phase === 'provider-removed').tool = true; }],
    ['dependent was not suspended', row => { row.executionAudit.find(item => item.phase === 'provider-removed').state = 'ACTIVE'; }],
    ['stale listener still observes', row => { row.executionAudit.push({ type: 'consumer-turn-end', owner: row.executionAudit.find(item => item.type === 'consumer-loaded').owner, turn: 1 }); }],
    ['provider closed too early', row => {
      const index = row.executionAudit.findIndex(item => item.type === 'provider-unloaded');
      const [closed] = row.executionAudit.splice(index, 1); row.executionAudit.unshift(closed);
    }],
    ['cleanup is incomplete', row => { row.cleanup.temporaryRootRemoved = false; }],
  ];
  for (const [name, change] of changes) await t.test(name, () => {
    const row = structuredClone(report); change(row); assert.throws(() => inspect(row, 'file', true));
  });
});
