// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspect } from './verify.mjs';

const path = process.env.BOOK_BAD_SERVICE_REPORT;
test('reject the real previously accepted provider that ignores id, cancellation and copy semantics', { skip: !path }, async () => {
  const report = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(report.functionalPassed, true, 'The old fixed-ticket gate really accepted this run');
  assert.throws(() => inspect(report, 'reader'));
});
