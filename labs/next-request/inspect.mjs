// SPDX-License-Identifier: Apache-2.0
/** Compare this book's normal S1 request pair with its persisted tool events. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const expected = { id: 'TK-1042', status: 'open', title: 'Invoice export failed' };
const blocks = body => body.messages.flatMap((message, index) =>
  message.content.map(block => ({ index, role: message.role, block })));
const one = (items, label) => {
  assert.equal(items.length, 1, `${label}: expected exactly one`);
  return items[0];
};

/** Check the fixed normal fixture and return only the fields taught in chapter 5. */
export function inspect(report, rows, { presentation = 'full' } = {}) {
  assert.ok(['full', 'summary'].includes(presentation));
  const expectedContent = presentation === 'summary' ? { id: expected.id, title: expected.title } : expected;
  assert.equal(report.scenario, 'S1', 'This comparison only supports the normal S1 fixture');
  assert.equal(report.sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  assert.equal(report.sourceTrackedChanges, '');
  assert.equal(report.functionalPassed, true);
  assert.equal(report.applicationExitCode, 0);
  assert.equal(report.watchdogExpired, false);
  for (const key of ['mockServerClosed', 'childExited', 'temporaryRootRemoved']) {
    assert.equal(report.cleanup[key], true, `Missing cleanup: ${key}`);
  }
  assert.equal(rows[0].type, 'session');
  assert.equal(rows[0].version, 4);
  assert.equal(rows[0].id, report.durableSession.id);
  const events = rows.slice(1);
  events.forEach((event, index) => assert.equal(event.seq, index, 'Noncontiguous durable events'));
  assert.equal(report.requestBodies.length, 2);
  assert.deepEqual(report.requests.map(request => request.behavior), ['tool_call_success', 'success']);
  const first = blocks(report.requestBodies[0]);
  const second = blocks(report.requestBodies[1]);
  one(report.requestBodies[0].tools.filter(tool => tool.name === 'book_ticket_lookup'), 'registered tool');
  assert.equal(first.filter(row => ['tool_use', 'tool_result'].includes(row.block.type)).length, 0);
  const use = one(second.filter(row => row.block.type === 'tool_use'), 'second-request tool_use');
  const result = one(second.filter(row => row.block.type === 'tool_result'), 'second-request tool_result');
  assert.equal(use.role, 'assistant');
  assert.equal(result.role, 'user');
  assert.ok(use.index < result.index, 'Result must follow the call');
  assert.equal(use.block.name, 'book_ticket_lookup');
  assert.deepEqual(use.block.input, { id: 'TK-1042' });
  assert.equal(result.block.tool_use_id, use.block.id, 'Wire call/result IDs differ');
  assert.equal(result.block.is_error, false);
  const wireText = one(result.block.content, 'wire result text');
  assert.equal(wireText.type, 'text');
  assert.deepEqual(JSON.parse(wireText.text), expectedContent, 'Wire ticket differs');
  const call = one(events.filter(event => event.type === 'tool/call'), 'durable tool/call');
  const saved = one(events.filter(event => event.type === 'tool/result'), 'durable tool/result');
  assert.equal(call.data.name, use.block.name);
  assert.equal(call.data.callId, use.block.id);
  assert.deepEqual(JSON.parse(call.data.arguments), use.block.input);
  assert.deepEqual(saved.sourceEventSeqs, [call.seq]);
  assert.equal(saved.surfaceOp, 'append');
  assert.ok(saved.seq > call.seq);
  assert.equal(saved.data.message.role, 'tool');
  assert.equal(saved.data.message.toolCallId, use.block.id);
  assert.equal(saved.data.message.isError, false);
  assert.deepEqual(saved.data.message.content, result.block.content, 'Persisted/wire result content differs');
  const executed = one(report.executionAudit.filter(row => row.type === 'execute'), 'execute entry');
  assert.equal(executed.tool, use.block.name);
  assert.deepEqual(executed.input, use.block.input);
  const starts = events.filter(event => event.type === 'step/start');
  assert.deepEqual(starts.map(event => [event.data.turn, event.data.step]), [[1, 1], [1, 2]]);
  assert.ok(saved.seq < starts[1].seq);
  const end = one(events.filter(event => event.type === 'turn/end'), 'turn/end');
  assert.deepEqual(end.data.reason, { kind: 'completed' });
  const final = one(events.filter(event => event.type === 'assistant/message' && event.data.step === 2), 'final assistant');
  assert.ok(final.seq > starts[1].seq && end.seq > final.seq);
  assert.equal(report.stdout, 'M1 query completed.\n');
  return {
    fixture: 'S1', sourceCommit: report.sourceCommit,
    scope: 'Selected fields only; not a full request dump or a general Session verifier',
    firstRequest: { hasTicketToolDefinition: true, toolUseCount: 0, toolResultCount: 0 },
    secondRequest: { toolUse: use, toolResult: result },
    persisted: { call, result: saved },
    timeline: events.map(event => ({ seq: event.seq, type: event.type,
      ...event.data.turn === undefined ? {} : { turn: event.data.turn },
      ...event.data.step === undefined ? {} : { step: event.data.step } })),
    ticket: JSON.parse(wireText.text), requestCount: 2, executeCount: 1, turnCount: 1, stepCount: 2,
    applicationExitCode: report.applicationExitCode, stdout: report.stdout, cleanup: report.cleanup,
    externalNetworkIsolationVerified: false, readerAccepted: false,
  };
}

/** Read the normal runner's original JSON and JSONL files without changing either. */
export async function load(directory) {
  const reportBytes = await readFile(join(directory, 'report.json'));
  const durableBytes = await readFile(join(directory, 'durable-0.jsonl'));
  return { report: JSON.parse(reportBytes),
    rows: durableBytes.toString('utf8').trim().split('\n').map(line => JSON.parse(line)),
    hashes: Object.fromEntries([['report.json', reportBytes], ['durable-0.jsonl', durableBytes]]
      .map(([name, bytes]) => [name, createHash('sha256').update(bytes).digest('hex')])) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.ok(process.argv[2], 'Usage: node inspect.mjs <S1-evidence-directory> [new-excerpt.json]');
  const { report, rows, hashes } = await load(resolve(process.argv[2]));
  const excerpt = { ...inspect(report, rows, { presentation: process.argv[4] ?? 'full' }), inputSha256: hashes };
  if (process.argv[3]) await writeFile(resolve(process.argv[3]), `${JSON.stringify(excerpt, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ requestCount: excerpt.requestCount, executeCount: excerpt.executeCount,
    turnCount: excerpt.turnCount, stepCount: excerpt.stepCount, ticket: excerpt.ticket, passed: true }));
}
