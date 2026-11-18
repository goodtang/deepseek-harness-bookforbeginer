// SPDX-License-Identifier: Apache-2.0
/** Verify actual profile evidence, provider choice and scoped teardown independently of final text. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sha = data => createHash('sha256').update(data).digest('hex');
export function inspect(report, source, lifecycle = false) {
  assert.equal(report.functionalPassed, true);
  assert.equal(report.applicationExitCode, 0); assert.equal(report.watchdogExpired, false);
  assert.equal(report.sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  assert.equal(report.sourceTrackedChanges, '');
  assert.deepEqual(report.cleanup, { mockServerClosed: true, childExited: true, temporaryRootRemoved: true });
  assert.deepEqual(report.requests.map(row => row.behavior), ['tool_call_success', 'success']);
  assert.equal(report.sessionChecks.observedMatchesPersisted, true);
  assert.equal(report.sessionChecks.toolCallAndResultMatch, true);
  const audit = report.executionAudit;
  assert.equal(audit.filter(row => row.type === 'execute').length, 1);
  assert.deepEqual(audit.filter(row => row.type === 'provider-query').map(({ source, id }) => ({ source, id })), [{ source, id: 'TK-1042' }]);
  const states = audit.filter(row => row.type === 'composition-state');
  assert.deepEqual(states.map(row => [row.phase, row.state, row.service, row.tool]), [
    ['before-provider', 'PENDING', false, false], ['provider-ready', 'ACTIVE', true, true],
    ...lifecycle ? [['provider-removed', 'PENDING', false, false], ['replacement-ready', 'ACTIVE', true, true]] : [],
  ]);
  const loaded = audit.filter(row => row.type === 'consumer-loaded');
  const unloaded = audit.filter(row => row.type === 'consumer-unloaded');
  assert.equal(loaded.length, lifecycle ? 2 : 1);
  assert.deepEqual(unloaded.map(row => row.owner), loaded.map(row => row.owner));
  assert.deepEqual(audit.filter(row => row.type === 'consumer-turn-end').map(row => row.owner), [loaded.at(-1).owner]);
  const providers = audit.filter(row => row.type === 'provider-loaded').map(row => row.source);
  assert.deepEqual(providers, lifecycle ? ['memory', 'file'] : [source]);
  for (const [index, provider] of providers.entries()) {
    const stopped = audit.findIndex(row => row.type === 'provider-unloaded' && row.source === provider);
    const consumerStopped = audit.findIndex(row => row.type === 'consumer-unloaded' && row.owner === loaded[index].owner);
    assert.ok(consumerStopped >= 0 && stopped > consumerStopped);
  }
  const blocks = report.requestBodies[1].messages.flatMap(message => Array.isArray(message.content) ? message.content : []);
  const result = blocks.find(block => block.type === 'tool_result');
  assert.equal(result.is_error, false);
  const ticket = JSON.parse(result.content.filter(block => block.type === 'text').map(block => block.text).join(''));
  assert.deepEqual(ticket, { id: 'TK-1042', status: 'open', title: 'Invoice export failed' });
  return { source, lifecycle, toolExecutions: 1, requests: 2, ticket,
    stateTransitions: states, consumerMounts: loaded.length, observedTurnEnds: 1,
    consumersStoppedBeforeProviders: true, cleanup: report.cleanup };
}

if (process.argv[2]) {
  assert.equal(process.argv.length, 8, 'Usage: verify.mjs <memory-report> <file-report> <lifecycle-report> <reader-report> <missing-inject-report> <bad-file-report>');
  const scenarios = ['memory', 'file', 'lifecycle', 'reader', 'missing-inject', 'bad-file'];
  const runs = [];
  let commonToolSchema;
  for (const [index, path] of process.argv.slice(2).entries()) {
    const raw = await readFile(path); const report = JSON.parse(raw);
    if (index < 4) {
      const tool = report.requestBodies[0].tools.find(tool => tool.name === 'book_ticket_lookup');
      assert.ok(tool);
      if (commonToolSchema === undefined) commonToolSchema = tool;
      else assert.deepEqual(tool, commonToolSchema);
      runs.push({ scenario: scenarios[index], originalReportSha256: sha(raw),
        verification: inspect(report, index === 0 ? 'memory' : index === 3 ? 'reader' : 'file', index === 2) });
    }
    else {
      assert.equal(report.functionalPassed, false);
      assert.equal(report.watchdogExpired, false);
      assert.deepEqual(report.cleanup, { mockServerClosed: true, childExited: true, temporaryRootRemoved: true });
      const rows = report.executionAudit;
      if (index === 4) assert.ok(rows.some(row => row.type === 'composition-state' && row.phase === 'before-provider' && row.state === 'ACTIVE' && row.tool && !row.service));
      else { assert.ok(report.stderr.includes('Each ticket requires')); assert.equal(rows.filter(row => row.type === 'provider-loaded').length, 0); }
      runs.push({ scenario: scenarios[index], originalReportSha256: sha(raw), applicationExitCode: report.applicationExitCode,
        functionalPassed: false, compositionStates: rows.filter(row => row.type === 'composition-state'),
        providerQueries: rows.filter(row => row.type === 'provider-query').length, cleanup: report.cleanup });
    }
  }
  console.log(JSON.stringify({ capturedAt: new Date().toISOString(), sourceCommit: 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159',
    runs, commonToolSchema, readerAccepted: false, networkIsolationVerified: false }, null, 2));
}
