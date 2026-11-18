// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectFailure } from './verify.mjs';
const path = process.env.BOOK_BAD_PATH_REPORT;
test('configured path failure must reach the expected stage and file', { skip: !path }, async t => {
  const report = JSON.parse(await readFile(path, 'utf8'));
  const expected = report.executionAudit.find(row => row.type === 'config-selected').path;
  inspectFailure(report, 'bad-path', expected);
  for (const [name, mutate] of [
    ['missing audit', r => { delete r.executionAudit; }],
    ['configuration not received', r => { r.executionAudit = r.executionAudit.filter(x => x.type !== 'config-selected'); }],
    ['other source selected', r => { r.executionAudit.find(x => x.type === 'config-selected').source = 'memory'; }],
    ['another path configured', r => { r.executionAudit.find(x => x.type === 'config-selected').path += '.different'; }],
    ['another provider path started', r => { r.executionAudit.find(x => x.type === 'file-provider-start').path += '.different'; }],
    ['another failed file', r => { r.executionAudit.find(x => x.type === 'file-provider-failed').failedPath += '.different'; }],
    ['wrong failure code', r => { r.executionAudit.find(x => x.type === 'file-provider-failed').errorCode = 'EACCES'; }],
    ['failure before provider start', r => { const i = r.executionAudit.findIndex(x => x.type === 'file-provider-failed'); const [x] = r.executionAudit.splice(i, 1); r.executionAudit.unshift(x); }],
  ]) await t.test(name, () => { const r = structuredClone(report); mutate(r); assert.throws(() => inspectFailure(r, 'bad-path', expected)); });
});
