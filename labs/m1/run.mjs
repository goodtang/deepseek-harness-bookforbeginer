// SPDX-License-Identifier: Apache-2.0
/** Exercise normal, broken-stream and public user-cancel paths, preserving durable Session files. */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const source = resolve(process.argv[2]);
const scenario = process.argv[3];
assert.ok(['S1', 'S2', 'S2-exhaust', 'S3'].includes(scenario));
assert.ok(process.argv[4], 'Usage: run.mjs <source-root> <S1|S2|S3> <new-evidence-directory>');
const output = resolve(process.argv[4]);
const here = dirname(fileURLToPath(import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
const report = { scenario, capturedAt: new Date().toISOString(), node: process.version,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(),
  sourceTrackedChanges: execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: source, encoding: 'utf8' }).trim(),
  networkIsolation: { verified: false, scope: 'Loopback model configuration only; no OS external-network block established' },
  cleanup: {}, files: {} };
assert.equal(report.sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159'); assert.equal(report.sourceTrackedChanges, '');
for (const name of ['run.mjs', 'observer.mjs', '../tool-cases/support.mjs', '../tool-cases/stages/plugin.mjs', '../first-tool/tickets.mjs']) {
  report.files[name] = sha(await readFile(join(here, name)));
}
const loader = pathToFileURL(createRequire(join(source, 'package.json')).resolve('tsx/esm')).href;
const { startMockLlmServer } = await import(pathToFileURL(join(source, 'packages/test-support/llm-mock-server/src/index.ts')).href);
await mkdir(dirname(output), { recursive: true }); await mkdir(output);
const root = await mkdtemp(join(tmpdir(), 'book-m1-'));
const home = join(root, 'home'); const workspace = join(root, 'workspace');
const sessions = join(root, 'sessions'); const auditPath = join(root, 'execution.jsonl');
const eventPath = join(root, 'events.jsonl'); const controlPath = join(root, 'control.json');
const exhausted = scenario === 'S2-exhaust';
const sequence = exhausted ? ['partial_disconnect', 'partial_disconnect'] : scenario === 'S2' ? ['partial_disconnect', 'tool_call_success', 'success'] :
  scenario === 'S3' ? ['tool_call_success', 'stall'] : ['tool_call_success', 'success'];
const marker = 'BOOK_PARTIAL_MUST_NOT_BECOME_A_SUCCESS';
let server; let child; let failure; let watchdogExpired = false;
try {
  await mkdir(home); await mkdir(workspace);
  const overlay = ['- id: session-title-llm', '  disabled: true',
    '- id: llm-deepseek', '  config:', '    retryPolicy:', '      mode: normal', '      maxRetries: 1',
    '      backoff:', '        initialDelayMs: 10', '        maxDelayMs: 10', '        jitterRatio: 0',
    '- id: session-persistence-jsonl', '  config:', `    root: ${JSON.stringify(sessions.replaceAll('\\', '/'))}`,
    '    compression: none', '- insert:', '    - id: book-ticket-tool',
    `      name: ${JSON.stringify(join(here, '../tool-cases/stages/plugin.mjs').replaceAll('\\', '/'))}`,
    '    - id: book-m1-observer', `      name: ${JSON.stringify(join(here, 'observer.mjs').replaceAll('\\', '/'))}`, ''].join('\n');
  const patch = join(root, 'patch.yml'); await writeFile(patch, overlay); await writeFile(join(output, 'overlay.yml'), overlay);
  server = await startMockLlmServer({ host: '127.0.0.1', port: 0, apiKey: 'book-mock-key', randomSeed: 1042,
    sequence, repeatLast: false, toolName: 'book_ticket_lookup', toolArguments: '{"id":"TK-1042"}',
    partialText: marker, successText: 'M1 query completed.' });
  child = spawn(process.execPath, ['--import', loader, join(source, 'apps/cli/src/bin.ts'), '--profile', 'headless',
    '--patch', patch, 'Look up TK-1042 with book_ticket_lookup.'], { cwd: workspace, windowsHide: true,
    env: { ...process.env, DSH_HOME: home, BOOK_DSH_SOURCE: source, BOOK_EXECUTION_LOG: auditPath,
      BOOK_SESSION_EVENTS: eventPath, BOOK_CONTROL_FILE: controlPath, TSX_TSCONFIG_PATH: join(source, 'tsconfig.json'),
      DEEPSEEK_API_KEY: 'book-mock-key', DEEPSEEK_BASE_URL: `${server.baseURL}/v1` },
    stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const closed = once(child, 'close');
  const timer = setTimeout(() => { watchdogExpired = true; child.kill(); }, 45000);
  let polling; let controlTask;
  try {
    if (scenario === 'S3') {
      let sending = false;
      polling = setInterval(async () => {
        if (sending || !server.requests.some(request => request.behavior === 'stall' && request.outcome === 'stalled')) return;
        sending = true; clearInterval(polling);
        controlTask = (async () => {
        try {
          const control = JSON.parse(await readFile(controlPath, 'utf8'));
          report.cancelSynchronization = { attempt: server.requests.at(-1).attempt, behavior: 'stall', outcome: 'stalled' };
          const result = await fetch(`http://127.0.0.1:${control.port}/cancel`, { method: 'POST' });
          report.controlResponse = { status: result.status, body: await result.json() };
        } catch (error) { report.controlFailure = String(error); child.kill(); }
        })();
      }, 20);
    }
    const [code, signal] = await closed; await controlTask; report.applicationExitCode = code; report.signal = signal;
  } finally { clearTimeout(timer); clearInterval(polling); }
  report.watchdogExpired = watchdogExpired;
  report.stdout = stdout; report.stderr = stderr;
  assert.equal(watchdogExpired, false, 'Watchdog expired before natural completion; this is not user cancellation');
  report.executionAudit = (await readFile(auditPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  await copyFile(eventPath, join(output, 'observed-events.jsonl'));
  const durable = [];
  const durableEvents = [];
  const collect = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await collect(path);
      else if (/^session.*\.jsonl$/.test(entry.name)) {
        const name = `durable-${durable.length}.jsonl`; const raw = await readFile(path);
        await writeFile(join(output, name), raw); durable.push({ file: name, sha256: sha(raw) });
        const rows = raw.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
        assert.equal(rows[0].type, 'session');
        report.durableSession = { id: rows[0].id, version: rows[0].version };
        durableEvents.push(...rows.slice(1));
      }
    }
  };
  await collect(sessions); report.durableFiles = durable;
  report.requestBodies = server.requests.map(request => request.body);
  assert.equal(watchdogExpired, false); assert.equal(report.applicationExitCode, scenario === 'S3' || exhausted ? 1 : 0, stderr);
  assert.deepEqual(server.requests.map(request => request.behavior), sequence);
  assert.equal(report.executionAudit.filter(event => event.type === 'ready').length, 1);
  assert.equal(report.executionAudit.filter(event => event.type === 'execute').length, exhausted ? 0 : 1);
  assert.equal(durable.length, 1, 'Exactly one durable root Session is expected');
  const observed = (await readFile(eventPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(durableEvents, observed.filter(row => row.event).map(row => row.event), 'Persisted events differ from committed live events');
  const calls = durableEvents.filter(event => event.type === 'tool/call');
  const results = durableEvents.filter(event => event.type === 'tool/result');
  assert.equal(calls.length, exhausted ? 0 : 1); assert.equal(results.length, exhausted ? 0 : 1);
  if (!exhausted) {
  assert.equal(calls[0].data.name, 'book_ticket_lookup');
  assert.deepEqual(JSON.parse(calls[0].data.arguments), { id: 'TK-1042' });
  assert.equal(results[0].data.message.toolCallId, calls[0].data.callId);
  assert.equal(results[0].data.message.isError, false);
  assert.deepEqual(JSON.parse(results[0].data.message.content[0].text), { id: 'TK-1042', status: 'open', title: 'Invoice export failed' });
  }
  const terminal = durableEvents.filter(event => event.type === 'turn/end');
  assert.equal(terminal.length, 1);
  if (exhausted) {
    assert.equal(terminal[0].data.reason.kind, 'error'); assert.equal(terminal[0].data.reason.error.code, 'TRANSPORT');
  } else assert.deepEqual(terminal[0].data.reason, scenario === 'S3' ? { kind: 'aborted', reason: { kind: 'user' } } : { kind: 'completed' });
  assert.ok(!durableEvents.filter(event => event.type === 'assistant/message').some(event => JSON.stringify(event.data.message.content).includes(marker)));
  report.sessionChecks = { eventCount: durableEvents.length, observedMatchesPersisted: true,
    toolCallAndResultMatch: true, terminal: terminal[0], failedPartialNotCommittedAsAssistant: true };
  if (scenario !== 'S3' && !exhausted) assert.equal(stdout, 'M1 query completed.\n');
  if (scenario === 'S2' || exhausted) {
    assert.equal(server.requests[0].outcome, 'reset'); assert.ok(server.requests[0].chunksSent > 0);
    for (const request of server.requests.slice(1)) assert.ok(!JSON.stringify(request.body.messages).includes(marker));
    assert.ok(!stdout.includes(marker));
    const retries = durableEvents.filter(event => event.type === 'llm/retry');
    assert.equal(retries.length, 1); assert.equal(retries[0].data.maxRetries, 1);
    assert.equal(retries[0].data.failure.code, 'TRANSPORT');
    assert.equal(durableEvents.filter(event => event.type === 'llm/retry-started').length, 1);
    report.sessionChecks.retry = retries[0];
  }
  if (scenario === 'S3') {
    assert.equal(report.controlResponse.status, 200); assert.equal(report.controlResponse.body.accepted, true);
    const controls = observed.filter(row => row.control === 'user-cancel');
    assert.equal(controls.length, 1); assert.equal(controls[0].sessionId, report.durableSession.id);
    assert.ok(terminal[0].seq > controls[0].atSeq);
    report.sessionChecks.controlTrigger = controls[0];
    assert.equal(durableEvents.filter(event => event.type === 'llm/retry').length, 0);
  }
} catch (error) { failure = error; report.failure = String(error); }
finally {
  if (child && child.exitCode === null && child.signalCode === null) { const done = once(child, 'close'); child.kill(); await done; }
  if (server) { await server.close(); report.cleanup.mockServerClosed = true; }
  report.cleanup.childExited = !child || child.exitCode !== null || child.signalCode !== null;
  report.requests = server?.requests.map(request => ({ attempt: request.attempt, behavior: request.behavior,
    outcome: request.outcome, chunksSent: request.chunksSent }));
  await rm(root, { recursive: true });
  try { await access(root); report.cleanup.temporaryRootRemoved = false; }
  catch (error) { if (error.code !== 'ENOENT') throw error; report.cleanup.temporaryRootRemoved = true; }
  report.functionalPassed = !failure && Object.values(report.cleanup).every(Boolean);
  report.m1EngineeringAccepted = false;
  await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ functionalPassed: report.functionalPassed, m1EngineeringAccepted: false, evidence: output }));
if (!report.functionalPassed) process.exitCode = 1;
