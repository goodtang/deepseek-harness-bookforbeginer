// SPDX-License-Identifier: Apache-2.0
/** Check configured selection against the actual mounted provider and model-facing tool result. */
import assert from 'node:assert/strict';
import { toolQueries, baseTicket } from '../plugin-services/service-checks.mjs';

export function inspect(report, source) {
  assert.equal(report.functionalPassed, true);
  assert.equal(report.applicationExitCode, 0); assert.equal(report.watchdogExpired, false);
  assert.equal(report.sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  assert.equal(report.sourceTrackedChanges, '');
  assert.match(report.extraPatch.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(report.cleanup, { mockServerClosed: true, childExited: true, temporaryRootRemoved: true });
  const audit = report.executionAudit;
  const selected = audit.filter(row => row.type === 'config-selected');
  assert.equal(selected.length, 1); assert.equal(selected[0].source, source);
  assert.deepEqual(toolQueries(audit, 1), [{ source, id: baseTicket.id }]);
  assert.equal(audit.filter(row => row.type === 'execute').length, 1);
  assert.equal(audit.filter(row => row.type === 'consumer-unloaded').length, 1);
  assert.equal(audit.filter(row => row.type === 'provider-unloaded').length, 1);
  assert.equal(report.sessionChecks.observedMatchesPersisted, true);
  assert.equal(report.sessionChecks.toolCallAndResultMatch, true);
  assert.equal(report.sessionChecks.terminal.data.reason.kind, 'completed');
  assert.deepEqual(report.requests.map(row => row.behavior), ['tool_call_success', 'success']);
  const blocks = report.requestBodies[1].messages.flatMap(row => Array.isArray(row.content) ? row.content : []);
  const result = blocks.find(row => row.type === 'tool_result');
  assert.equal(result.is_error, false);
  assert.deepEqual(JSON.parse(result.content.filter(row => row.type === 'text').map(row => row.text).join('')), baseTicket);
  return { source, requests: 2, toolExecutions: 1, ticket: baseTicket, serviceChecks: 1, cleanup: report.cleanup };
}
