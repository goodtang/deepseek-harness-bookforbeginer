// SPDX-License-Identifier: Apache-2.0
/** Verify an actual full/summary/restored render experiment from three independent runs. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { inspect, load } from './inspect.mjs';

assert.ok(process.argv[4], 'Usage: node compare-render.mjs <full-directory> <summary-directory> <restored-directory> [new-result.json]');
const runs = await Promise.all(process.argv.slice(2, 5).map(load));
const full = { id: 'TK-1042', status: 'open', title: 'Invoice export failed' };
const summary = { id: full.id, title: full.title };
function verifyRun(input, presentation) {
  const rendered = presentation === 'summary' ? summary : full;
  const inspected = inspect(input.report, input.rows, { presentation });
  const audit = input.report.executionAudit.filter(row => row.type === 'render');
  assert.equal(audit.length, 1, 'Need one observed real pipeline render invocation');
  assert.deepEqual(audit[0].value, full, 'Business value changed');
  assert.deepEqual(audit[0].content, inspected.persisted.result.data.message.content);
  assert.deepEqual(JSON.parse(audit[0].content[0].text), rendered);
  assert.equal(inspected.executeCount, 1);
  return { presentation, businessValue: audit[0].value, renderedValue: rendered,
    persistedContent: inspected.persisted.result.data.message.content,
    requestContent: inspected.secondRequest.toolResult.block.content,
    requestCount: inspected.requestCount, executeCount: inspected.executeCount,
    applicationExitCode: inspected.applicationExitCode, cleanup: inspected.cleanup,
    pluginSha256: input.report.plugin.sha256, inputSha256: input.hashes };
}
const results = runs.map((input, index) => verifyRun(input, index === 1 ? 'summary' : 'full'));
assert.equal(results[0].pluginSha256, results[2].pluginSha256, 'Restored plugin bytes differ');
assert.notEqual(results[0].pluginSha256, results[1].pluginSha256, 'No actual plugin edit');
// An edited business return must not be accepted as a presentation-only change.
const changed = structuredClone(runs[1]);
changed.report.executionAudit.find(row => row.type === 'render').value.status = 'closed';
assert.throws(() => verifyRun(changed, 'summary'), /Business value changed/);
const result = { passed: true, scope: 'Real profile runs with an edited and restored plugin; sampled render input is business value',
  runs: results, businessValueNegativeControlRejected: true,
  readerAccepted: false, externalNetworkIsolationVerified: false };
if (process.argv[5]) await writeFile(process.argv[5], `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ passed: true, realRuns: 3, unchangedBusinessValue: true, restoredPlugin: true }));
