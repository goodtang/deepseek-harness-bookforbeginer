// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspect } from './inspect.mjs';

// The acceptance input is a real run, never a hand-written passing fixture.
const path = process.env.BOOK_REENTRY_REPORT;
test('a real run and altered evidence distinguish restoration from apparent success', { skip: !path }, async t => {
  const report = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(inspect(report).passed, true);
  const mutations = [
    ['same process', value => { value.phases[1].pid = value.phases[0].pid; }],
    ['missing request', value => { value.phases[1].requestMessages = []; }],
    ['noncontiguous events', value => { value.phases[1].events[0].seq += 1; }],
    ['changed old prefix', value => { value.phases[1].oldPrefixSha256 = 'changed'; }],
    ['reexecuted old tool', value => { value.phases[1].executionCount = 1; }],
    ['missing cleanup', value => { value.cleanup.temporaryRootRemoved = false; }],
  ];
  for (const [name, mutate] of mutations) {
    await t.test(name, () => {
      const altered = structuredClone(report); mutate(altered);
      assert.throws(() => inspect(altered));
    });
  }
});
