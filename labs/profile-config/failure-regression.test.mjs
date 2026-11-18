// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectFailure } from './verify.mjs';
const path = process.env.BOOK_WRONG_FAILURE_REPORT;
test('unrelated real ENOENT is not the configured ticket-path failure', { skip: !path }, async () => {
  const report = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(report.functionalPassed, false);
  assert.ok(report.stderr.includes('unrelated-settings-that-do-not-exist.json'));
  assert.throws(() => inspectFailure(report, 'bad-path', '/exercise/missing.json'));
});
