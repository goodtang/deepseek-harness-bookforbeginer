// SPDX-License-Identifier: Apache-2.0
/** Check waiting/cancellation evidence without publishing complete prompts or Session payloads. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const one = (rows, label) => { assert.equal(rows.length, 1, label); return rows[0]; };
export async function load(directory) {
  const report = await readFile(join(directory, 'report.json'));
  const durable = await readFile(join(directory, 'durable-0.jsonl'));
  const observed = await readFile(join(directory, 'observed-events.jsonl'));
  const lines = bytes => bytes.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
  return { report: JSON.parse(report), durable: lines(durable), observed: lines(observed),
    inputSha256: Object.fromEntries([['report.json', report], ['durable-0.jsonl', durable], ['observed-events.jsonl', observed]]
      .map(([name, bytes]) => [name, createHash('sha256').update(bytes).digest('hex')])) };
}

export function inspect(input) {
  const { report: r, durable, observed } = input;
  assert.ok(['gate-release', 'gate-cancel', 'gate-uncooperative', 'S3'].includes(r.scenario));
  const released = r.scenario === 'gate-release';
  const gated = r.scenario !== 'S3';
  assert.equal(r.sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  assert.equal(r.sourceTrackedChanges, '');
  assert.equal(r.functionalPassed, true);
  assert.equal(r.watchdogExpired, false, 'Watchdog is not user cancellation');
  assert.equal(r.applicationExitCode, released ? 0 : 1);
  for (const name of ['mockServerClosed', 'childExited', 'temporaryRootRemoved']) assert.equal(r.cleanup[name], true);
  assert.equal(durable[0].type, 'session'); assert.equal(durable[0].version, 4);
  const events = durable.slice(1);
  events.forEach((event, index) => assert.equal(event.seq, index));
  assert.deepEqual(events, observed.filter(row => row.event).map(row => row.event));
  const call = one(events.filter(event => event.type === 'tool/call'), 'one call');
  const result = one(events.filter(event => event.type === 'tool/result'), 'one result');
  const end = one(events.filter(event => event.type === 'turn/end'), 'one turn end');
  assert.equal(call.data.name, 'book_ticket_lookup');
  assert.deepEqual(JSON.parse(call.data.arguments), { id: 'TK-1042' });
  assert.equal(result.data.message.toolCallId, call.data.callId);
  assert.deepEqual(result.sourceEventSeqs, [call.seq]);
  assert.equal(result.data.message.isError, gated && !released);
  assert.deepEqual(end.data.reason, released ? { kind: 'completed' } : { kind: 'aborted', reason: { kind: 'user' } });
  assert.ok(end.seq > result.seq);
  assert.equal(r.requests.length, released || !gated ? 2 : 1);
  const execute = one(r.executionAudit.filter(row => row.type === 'execute'), 'one real execute entry');
  assert.deepEqual(execute.input, { id: 'TK-1042' });
  const controls = observed.filter(row => row.control === 'user-cancel');
  let cancelAtSeq = null;
  if (released) assert.equal(controls.length, 0);
  else {
    const control = one(controls, 'one public cancel');
    assert.equal(control.sessionId, durable[0].id);
    assert.equal(r.controlResponse.status, 200); assert.equal(r.controlResponse.body.accepted, true);
    cancelAtSeq = control.atSeq;
    assert.ok(end.seq > cancelAtSeq);
    assert.ok(gated ? cancelAtSeq <= result.seq : cancelAtSeq > result.seq);
  }
  assert.equal(events.filter(event => event.type === 'llm/retry').length, 0);
  let businessLookupCount = null;
  if (gated) {
    assert.deepEqual(r.gateSynchronization, { waiting: true, aborted: false, cooperate: r.scenario !== 'gate-uncooperative' });
    const settled = one(r.executionAudit.filter(row => row.type === 'gate-settled'), 'one settled wait');
    assert.equal(settled.outcome, r.scenario === 'gate-cancel' ? 'aborted' : 'released');
    businessLookupCount = r.executionAudit.filter(row => row.type === 'business-lookup').length;
    assert.equal(businessLookupCount, released ? 1 : 0, 'Business call after cancellation');
    one(r.executionAudit.filter(row => row.type === 'execute-finally'), 'execute finally');
    one(r.executionAudit.filter(row => row.type === 'gate-server-closed'), 'gate server cleanup');
    if (r.scenario !== 'gate-cancel') {
      assert.equal(r.releaseResponse.status, 200); assert.equal(r.releaseResponse.body.released, true);
    }
  }
  if (r.scenario === 'gate-uncooperative') {
    assert.deepEqual(r.pendingAfterCancel, { waiting: true, aborted: true, cooperate: false }, 'Still waiting after accepted cancellation');
    assert.ok(!r.pendingAuditTypes.includes('execute-finally'));
    assert.ok(!r.pendingAuditTypes.includes('business-lookup'));
  }
  if (!gated) assert.deepEqual(r.cancelSynchronization, { attempt: 2, behavior: 'stall', outcome: 'stalled' });
  if (released || !gated) {
    const ticket = JSON.parse(result.data.message.content[0].text);
    assert.deepEqual(ticket, { id: 'TK-1042', status: 'open', title: 'Invoice export failed' });
  }
  return { scenario: r.scenario, sourceCommit: r.sourceCommit, requestCount: r.requests.length, executeCount: 1,
    businessLookupCount, cancelAtSeq, resultAtSeq: result.seq, resultIsError: result.data.message.isError,
    turnEnd: { seq: end.seq, reason: end.data.reason },
    waitingWhenTriggered: r.gateSynchronization ?? r.cancelSynchronization,
    pendingAfterCancel: r.pendingAfterCancel ?? null,
    pendingAuditTypes: r.pendingAuditTypes ?? null,
    audit: r.executionAudit, applicationExitCode: r.applicationExitCode, watchdogExpired: r.watchdogExpired,
    cleanup: r.cleanup, pluginSha256: r.plugin.sha256, inputSha256: input.inputSha256,
    readerAccepted: false, externalNetworkIsolationVerified: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.ok(process.argv[2], 'Usage: node inspect.mjs <evidence-directory> [new-excerpt.json]');
  const result = inspect(await load(process.argv[2]));
  if (process.argv[3]) await writeFile(process.argv[3], `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ scenario: result.scenario, requestCount: result.requestCount,
    businessLookupCount: result.businessLookupCount, end: result.turnEnd.reason, passed: true }));
}
