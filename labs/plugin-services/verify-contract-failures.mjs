// SPDX-License-Identifier: Apache-2.0
/** Check three real bad providers were rejected at their corresponding service-semantic assertions. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

assert.equal(process.argv.length, 5, 'Usage: verify-contract-failures.mjs <always-first-report> <no-copy-report> <no-cancel-report>');
const expectedCases = [['known-id'], ['known-id', 'missing-id'], ['known-id', 'missing-id', 'independent-copy']];
const names = ['always-first', 'no-copy', 'no-cancel']; const runs = [];
for (const [index, path] of process.argv.slice(2).entries()) {
  const raw = await readFile(path); const report = JSON.parse(raw); const audit = report.executionAudit;
  assert.equal(report.functionalPassed, false); assert.equal(report.watchdogExpired, false);
  assert.equal(report.sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  assert.deepEqual(report.cleanup, { mockServerClosed: true, childExited: true, temporaryRootRemoved: true });
  assert.equal(audit.filter(row => row.type === 'service-check-start').length, 1);
  assert.equal(audit.filter(row => row.type === 'service-check-passed').length, 0);
  assert.deepEqual(audit.filter(row => row.type === 'service-check-case').map(row => row.name), expectedCases[index]);
  assert.equal(audit.filter(row => row.type === 'execute').length, 0, 'Startup semantic check must block this tool composition');
  runs.push({ scenario: names[index], originalReportSha256: createHash('sha256').update(raw).digest('hex'),
    applicationExitCode: report.applicationExitCode, functionalPassed: false, completedCases: expectedCases[index],
    toolExecutions: 0, cleanup: report.cleanup });
}
console.log(JSON.stringify({ capturedAt: new Date().toISOString(), runs, scope: 'Real profile/provider failures, not edited report copies' }, null, 2));
