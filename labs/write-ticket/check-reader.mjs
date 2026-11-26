// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [modulePath, committedReport, absentReport] = process.argv.slice(2);
assert.ok(modulePath && committedReport && absentReport, 'Usage: check-reader.mjs <your-module> <lost-after-report> <lost-before-report>');
const { inspectReceipt } = await import(pathToFileURL(resolve(modulePath)).href);
const yes = JSON.parse(await readFile(committedReport, 'utf8')); const no = JSON.parse(await readFile(absentReport, 'utf8'));
assert.equal(yes.scenario, 'lost-after'); assert.equal(no.scenario, 'lost-before'); assert.equal(yes.accepted, true); assert.equal(no.accepted, true);
const expected = { id: 'TK-1042', status: 'closed', expectedVersion: 1, operationId: 'close-1042-01' };
const saved = yes.phases[0].receipt;
assert.deepEqual(inspectReceipt(saved, expected), { state: 'committed', operationId: expected.operationId });
assert.deepEqual(inspectReceipt(no.phases[0].receipt, expected), { state: 'unknown', operationId: expected.operationId });
for (const change of [r => { r.operationId = 'another-operation'; }, r => { r.ticket.id = 'TK-9999'; }, r => { r.ticket.version = 99; }, r => { r.ticket.status = 'open'; }]) {
  const receipt = structuredClone(saved); change(receipt);
  assert.deepEqual(inspectReceipt(receipt, expected), { state: 'unknown', operationId: expected.operationId });
}
console.log('6 receipt checks passed. Mutated receipts are checker exercises, not live business faults.');
