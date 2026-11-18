// SPDX-License-Identifier: Apache-2.0
/** Check cross-process history, append-only evidence and actual request content separately. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const ticket = { id: 'TK-1042', status: 'open', title: 'Invoice export failed' };
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function inspect(report) {
  const [first, second] = report.phases;
  assert.ok(['resume', 'fresh'].includes(report.mode));
  assert.equal(report.sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  assert.equal(report.sourceTrackedChanges, '');
  assert.ok(first.pid > 0 && second.pid > 0);
  assert.notEqual(first.pid, second.pid, 'The second request must run in a different process');
  for (const phase of [first, second]) {
    assert.equal(phase.exitCode, 0); assert.equal(phase.signal, null);
    assert.equal(phase.watchdogExpired, false);
    phase.events.forEach((event, index) => assert.equal(event.seq, index));
    assert.ok(phase.events.length > 0);
    assert.equal(phase.events.at(-1).type, 'turn/end');
    assert.equal(phase.events.at(-1).data.reason.kind, 'completed');
  }
  assert.equal(first.requestMessages.length, 2);
  assert.equal(second.requestMessages.length, 1);
  assert.equal(first.executionCount, 1); assert.equal(second.executionCount, 0);
  const oldResults = first.events.filter(event => event.type === 'tool/result');
  assert.equal(oldResults.length, 1); assert.equal(oldResults[0].data.message.isError, false);
  const savedContent = oldResults[0].data.message.content.filter(block => block.type === 'text').map(block => block.text).join('');
  assert.deepEqual(JSON.parse(savedContent), ticket);
  const messages = second.requestMessages[0];
  const contents = messages.flatMap(message => Array.isArray(message.content) ? message.content : []);
  const toolResults = contents.filter(block => block.type === 'tool_result');
  const toolUses = contents.filter(block => block.type === 'tool_use');
  assert.ok(contents.some(block => block.type === 'text' && block.text === report.followup));
  assert.equal(second.oldPrefixSha256, first.durableSha256, 'The original committed prefix must remain byte-identical');
  if (report.mode === 'resume') {
    assert.equal(second.sessionId, first.sessionId);
    assert.deepEqual(second.events.slice(0, first.events.length), first.events);
    assert.equal(second.events.filter(event => event.type === 'turn/end').length, 2);
    assert.equal(toolResults.length, 1); assert.equal(toolUses.length, 1);
    assert.equal(toolResults[0].tool_use_id, toolUses[0].id);
    assert.equal(toolUses[0].name, 'book_ticket_lookup');
    const rendered = toolResults[0].content.filter(block => block.type === 'text').map(block => block.text).join('');
    assert.deepEqual(JSON.parse(rendered), ticket);
    for (const [name, diagnostic] of [['wrong-cwd', 'was recorded in'], ['missing-id', 'does not exist']]) {
      const refusal = report.phases.find(phase => phase.name === name);
      assert.ok(refusal); assert.equal(refusal.exitCode, 1); assert.equal(refusal.signal, null);
      assert.equal(refusal.watchdogExpired, false); assert.equal(refusal.requestMessages.length, 0);
      assert.equal(refusal.executionCount, 0); assert.ok(refusal.stderr.includes(diagnostic));
      assert.equal(refusal.durableUnchanged, true);
    }
  } else {
    assert.notEqual(second.sessionId, first.sessionId);
    assert.equal(toolResults.length, 0); assert.equal(toolUses.length, 0);
    assert.equal(second.events.filter(event => event.type === 'turn/end').length, 1);
  }
  assert.equal(report.requestsExhausted, false);
  assert.deepEqual(report.cleanup, { childrenExited: true, mockServerClosed: true, temporaryRootRemoved: true });
  return { passed: true, mode: report.mode, differentProcesses: true, oldPrefixUnchanged: true,
    historyInNewRequest: report.mode === 'resume', newToolExecutionCount: second.executionCount,
    firstEventCount: first.events.length, secondEventCount: second.events.length,
    refusalChecks: report.mode === 'resume' ? 2 : 0 };
}
