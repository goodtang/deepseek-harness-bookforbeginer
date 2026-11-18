// SPDX-License-Identifier: Apache-2.0
/** Compare a real reader exercise, upstream turn projection and actual failed launch variants. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspect, sha } from './inspect.mjs';
import { checkRecords, projectTurns } from './check-records.mjs';

assert.ok(process.argv.length === 7,
  'Usage: verify-practice.mjs <source> <ordinary-success> <omitted-id> <unknown-id> <restored-success>');
const source = resolve(process.argv[2]);
const { turnBoundaryProjectionDefinition: definition } = await import(pathToFileURL(join(source, 'packages/core/agent/src/projection.ts')).href);
const runs = [];
for (const [index, directory] of process.argv.slice(3).entries()) {
  const raw = await readFile(join(directory, 'report.json')); const report = JSON.parse(raw);
  assert.deepEqual(report.cleanup, { childrenExited: true, mockServerClosed: true, temporaryRootRemoved: true });
  assert.equal(report.requestsExhausted, false);
  assert.ok(report.phases.every(phase => phase.watchdogExpired === false));
  let records; let verification;
  if (index === 0 || index === 3) {
    assert.equal(report.passed, true); verification = inspect(report);
    records = checkRecords(await readFile(join(directory, 'first-durable.jsonl')), await readFile(join(directory, 'second-durable.jsonl')));
    for (const phase of report.phases.slice(0, 2)) {
      let upstream = definition.init();
      for (const event of phase.events) upstream = definition.apply(upstream, event);
      assert.deepEqual(projectTurns(phase.events), { lastTurn: upstream.lastTurn, openTurnStartSeq: upstream.openTurnStartSeq });
    }
    const identity = JSON.parse(await readFile(join(directory, 'selected-session.json'), 'utf8'));
    assert.equal(identity.sessionId, report.phases[0].sessionId);
    assert.equal(identity.sessionId, report.phases[1].requestedSessionId);
    assert.equal(identity.sessionId, report.practice.savedSessionId);
    assert.equal(report.practice.moduleSha256, sha(await readFile(new URL('./practice-completed.mjs', import.meta.url))));
  } else {
    assert.equal(report.passed, false);
    assert.equal(report.phases[0].exitCode, 0);
    if (index === 1) {
      assert.equal(report.phases.length, 4);
      assert.equal(report.phases[1].exitCode, 0);
      assert.notEqual(report.phases[0].sessionId, report.phases[1].sessionId);
      assert.equal(report.phases[1].requestedSessionId, null);
      assert.equal(report.phases[1].requestMessages.length, 1);
      assert.throws(() => inspect(report));
    } else {
      assert.equal(report.phases.length, 2);
      assert.equal(report.phases[1].exitCode, 1);
      assert.equal(report.phases[1].requestMessages.length, 0);
      assert.equal(report.phases[1].executionCount, 0);
      assert.ok(report.phases[1].stderr.includes('does not exist'));
    }
  }
  runs.push({ scenario: ['reader-completed', 'reader-omitted-id', 'reader-unknown-id', 'reader-restored'][index],
    originalReportSha256: sha(raw), sourceCommit: report.sourceCommit, passed: report.passed,
    practice: report.practice, phases: report.phases.map(phase => ({ name: phase.name, pid: phase.pid,
      sessionId: phase.sessionId ?? phase.requestedSessionId, exitCode: phase.exitCode,
      requestCount: phase.requestMessages.length, executionCount: phase.executionCount,
      watchdogExpired: phase.watchdogExpired })), records, verification, cleanup: report.cleanup });
}
const files = {};
for (const name of ['run.mjs', 'inspect.mjs', 'practice-start.mjs', 'practice-completed.mjs',
  'check-records.mjs', 'records.test.mjs', 'verify-practice.mjs']) files[name] = sha(await readFile(new URL(name, import.meta.url)));
console.log(JSON.stringify({ capturedAt: new Date().toISOString(), files, runs,
  upstreamProjectionSourceSha256: sha(await readFile(join(source, 'packages/core/agent/src/projection.ts'))),
  upstreamTwoFieldProjectionMatches: true, readerAccepted: false, externalNetworkIsolationVerified: false }, null, 2));
