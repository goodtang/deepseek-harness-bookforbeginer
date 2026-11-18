// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { checkRecords } from './check-records.mjs';

const directory = process.env.BOOK_RECORDS_DIR;
test('direct durable-record checks accept a real resume and reject changed fields', { skip: !directory }, async t => {
  const first = await readFile(join(directory, 'first-durable.jsonl'));
  const second = await readFile(join(directory, 'second-durable.jsonl'));
  assert.equal(checkRecords(first, second).secondTurn.lastTurn, 2);
  const rows = first.toString('utf8').trim().split('\n').map(JSON.parse);
  const mutations = [
    ['wrong result call id', data => { data.find(row => row.type === 'tool/result').data.message.toolCallId = 'wrong'; }],
    ['wrong business state', data => { data.find(row => row.type === 'tool/result').data.message.content[0].text = '{"id":"TK-1042","status":"closed","title":"Invoice export failed"}'; }],
    ['error disguised as query result', data => { data.find(row => row.type === 'tool/result').data.message.isError = true; }],
    ['wrong restored last turn', data => { data.find(row => row.type === 'turn/start').data.turn = 9; }],
  ];
  for (const [name, mutate] of mutations) await t.test(name, () => {
    const changed = structuredClone(rows); mutate(changed);
    // Keep an identical changed prefix in both files so the field assertion, not merely prefix equality, rejects it.
    const altered = Buffer.from(changed.map(row => JSON.stringify(row)).join('\n') + '\n');
    const tail = second.subarray(first.length);
    assert.throws(() => checkRecords(altered, Buffer.concat([altered, tail])));
  });
  await t.test('changed old bytes', () => assert.throws(() => checkRecords(first, Buffer.from(second.toString('utf8').replace('Invoice export failed', 'Changed title')))));
});
