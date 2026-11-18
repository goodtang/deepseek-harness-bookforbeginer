// SPDX-License-Identifier: Apache-2.0
/** Read actual durable files directly; this teaching fold is not the Harness projection implementation. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function projectTurns(events) {
  let state = { lastTurn: 0, openTurnStartSeq: null };
  for (const event of events) {
    if (event.type === 'turn/start') state = { lastTurn: event.data.turn, openTurnStartSeq: event.seq };
    if (event.type === 'turn/end') state = { ...state, openTurnStartSeq: null };
  }
  return state;
}

export function checkRecords(firstBytes, secondBytes) {
  const decode = bytes => bytes.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
  const firstRows = decode(firstBytes); const secondRows = decode(secondBytes);
  const header = firstRows[0]; const first = firstRows.slice(1); const second = secondRows.slice(1);
  assert.equal(header.type, 'session'); assert.equal(header.version, 4);
  assert.deepEqual(secondRows[0], header);
  assert.ok(secondBytes.subarray(0, firstBytes.length).equals(firstBytes), 'Old file must remain the exact prefix');
  for (const events of [first, second]) events.forEach((event, index) => assert.equal(event.seq, index));
  const calls = second.filter(event => event.type === 'tool/call');
  const results = second.filter(event => event.type === 'tool/result');
  assert.equal(calls.length, 1); assert.equal(results.length, 1);
  const call = calls[0]; const message = results[0].data.message;
  assert.equal(call.data.name, 'book_ticket_lookup');
  assert.deepEqual(JSON.parse(call.data.arguments), { id: 'TK-1042' });
  assert.equal(message.toolCallId, call.data.callId);
  assert.equal(message.isError, false);
  const text = message.content.filter(block => block.type === 'text').map(block => block.text).join('');
  const ticket = JSON.parse(text);
  assert.deepEqual(ticket, { id: 'TK-1042', status: 'open', title: 'Invoice export failed' });
  const ends = second.filter(event => event.type === 'turn/end');
  assert.deepEqual(ends.map(event => event.data.turn), [1, 2]);
  assert.deepEqual(ends.map(event => event.data.reason.kind), ['completed', 'completed']);
  const firstTurn = projectTurns(first); const secondTurn = projectTurns(second);
  assert.deepEqual(firstTurn, { lastTurn: 1, openTurnStartSeq: null });
  assert.deepEqual(secondTurn, { lastTurn: 2, openTurnStartSeq: null });
  return { sessionId: header.id, callId: call.data.callId, ticket, firstTurn, secondTurn,
    firstEventCount: first.length, secondEventCount: second.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.ok(process.argv[2] && process.argv[3], 'Usage: check-records.mjs <first-durable.jsonl> <second-durable.jsonl>');
  console.log(JSON.stringify(checkRecords(await readFile(process.argv[2]), await readFile(process.argv[3])), null, 2));
}
