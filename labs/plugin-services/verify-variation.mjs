// SPDX-License-Identifier: Apache-2.0
/** Independently check actual durable/wire results when the shared S1 runner deliberately expects the old title. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { baseTicket, toolQueries } from './service-checks.mjs';

assert.equal(process.argv.length, 6, 'Usage: verify-variation.mjs <exercise-directory> <baseline-evidence> <changed-evidence> <restored-evidence>');
const root = process.argv[2]; const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const phases = ['baseline', 'changed', 'restored']; const runs = [];
const original = await readFile(join(root, 'original.json'));
assert.deepEqual(await readFile(join(root, 'tickets.json')), original, 'The final owned input must be restored');
let schema;
for (const [index, directory] of process.argv.slice(3).entries()) {
  const phase = phases[index]; const expected = { ...baseTicket,
    title: phase === 'changed' ? 'Invoice export failed [JSON source changed]' : baseTicket.title };
  const raw = await readFile(join(directory, 'report.json')); const report = JSON.parse(raw);
  assert.equal(report.sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  assert.equal(report.sourceTrackedChanges, '');
  assert.equal(report.applicationExitCode, 0); assert.equal(report.watchdogExpired, false);
  assert.equal(report.functionalPassed, phase !== 'changed');
  assert.deepEqual(report.cleanup, { mockServerClosed: true, childExited: true, temporaryRootRemoved: true });
  assert.deepEqual(report.requests.map(row => row.behavior), ['tool_call_success', 'success']);
  assert.deepEqual(toolQueries(report.executionAudit, 1), [{ source: 'file', id: baseTicket.id }]);
  assert.equal(report.executionAudit.filter(row => row.type === 'execute').length, 1);
  const physical = await readFile(join(directory, 'durable-0.jsonl'));
  const rows = physical.toString('utf8').trim().split('\n').map(JSON.parse);
  const events = rows.slice(1); events.forEach((row, seq) => assert.equal(row.seq, seq));
  const observed = (await readFile(join(directory, 'observed-events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(row => row.event).map(row => row.event);
  assert.deepEqual(events, observed);
  const calls = events.filter(row => row.type === 'tool/call');
  const results = events.filter(row => row.type === 'tool/result');
  assert.equal(calls.length, 1); assert.equal(results.length, 1);
  assert.equal(calls[0].data.name, 'book_ticket_lookup');
  assert.deepEqual(JSON.parse(calls[0].data.arguments), { id: baseTicket.id });
  const message = results[0].data.message;
  assert.equal(message.toolCallId, calls[0].data.callId); assert.equal(message.isError, false);
  const decode = content => JSON.parse(content.filter(block => block.type === 'text').map(block => block.text).join(''));
  assert.deepEqual(decode(message.content), expected);
  const ends = events.filter(row => row.type === 'turn/end');
  assert.equal(ends.length, 1); assert.equal(ends[0].data.reason.kind, 'completed');
  const blocks = report.requestBodies[1].messages.flatMap(row => Array.isArray(row.content) ? row.content : []);
  const wire = blocks.find(row => row.type === 'tool_result');
  assert.equal(wire.tool_use_id, calls[0].data.callId); assert.equal(wire.is_error, false);
  assert.deepEqual(decode(wire.content), expected);
  const tool = report.requestBodies[0].tools.find(row => row.name === 'book_ticket_lookup');
  assert.ok(tool);
  if (schema === undefined) schema = tool; else assert.deepEqual(tool, schema);
  const input = await readFile(join(root, `${phase}-tickets.json`));
  assert.deepEqual(JSON.parse(input), [expected]);
  const entry = await readFile(join(root, `${phase}-entry.mjs`)); assert.equal(report.plugin.sha256, sha(entry));
  runs.push({ phase, originalReportSha256: sha(raw), inputSha256: sha(input), entrySha256: sha(entry),
    durableSha256: sha(physical), actualTicket: expected, fixedBaselineGatePassed: report.functionalPassed,
    independentlyVerified: true, applicationExitCode: report.applicationExitCode, requests: 2, toolExecutions: 1, cleanup: report.cleanup });
}
assert.equal(runs[0].inputSha256, runs[2].inputSha256); assert.notEqual(runs[0].inputSha256, runs[1].inputSha256);
console.log(JSON.stringify({ capturedAt: new Date().toISOString(), runs, originalInputRestored: true,
  sameToolSchema: true, scope: 'Three fresh headless processes reload the same owned JSON path; no file watcher or live-update claim' }, null, 2));
