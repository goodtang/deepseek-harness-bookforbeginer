// SPDX-License-Identifier: Apache-2.0
/** Publish selected synthetic exercise fields; omit system prompts, working-directory strings and full logs. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspect, sha } from './inspect.mjs';

assert.ok(process.argv.length >= 4, 'Usage: summarize.mjs <resume-report> <fresh-report> [additional-report]');
const runs = [];
for (const path of process.argv.slice(2)) {
  const raw = await readFile(path); const report = JSON.parse(raw);
  const verification = inspect(report);
  runs.push({ mode: report.mode, capturedAt: report.capturedAt, sourceCommit: report.sourceCommit,
    node: report.node, originalReportSha256: sha(raw), files: report.files, verification,
    followup: report.followup, phases: report.phases.map(phase => ({ name: phase.name, pid: phase.pid,
      sessionId: phase.sessionId ?? phase.requestedSessionId, exitCode: phase.exitCode,
      watchdogExpired: phase.watchdogExpired, requestCount: phase.requestMessages.length,
      executionCount: phase.executionCount, eventCount: phase.events?.length,
      sessionFormatVersion: phase.header?.version,
      durableSha256: phase.durableSha256, oldPrefixSha256: phase.oldPrefixSha256,
      turnEnds: phase.events?.filter(event => event.type === 'turn/end').map(event => ({ seq: event.seq, reason: event.data.reason })),
      requestToolBlocks: phase.requestMessages.map(messages => messages.flatMap(message =>
        Array.isArray(message.content) ? message.content.filter(block => ['tool_use', 'tool_result'].includes(block.type)) : [])),
      durableUnchanged: phase.durableUnchanged })), cleanup: report.cleanup,
    requests: report.requests, networkIsolation: report.networkIsolation });
}
console.log(JSON.stringify({ capturedAt: new Date().toISOString(), scope: 'Selected fields from real keyless Windows headless runs; not a reader acceptance', runs }, null, 2));
