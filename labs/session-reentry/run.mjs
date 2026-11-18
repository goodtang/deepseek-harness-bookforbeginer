// SPDX-License-Identifier: Apache-2.0
/** Keep one owned workspace and durable root across actual headless child processes, then remove them. */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspect, sha } from './inspect.mjs';

assert.ok(process.argv[2] && process.argv[3] && process.argv[4],
  'Usage: run.mjs <source-root> <resume|fresh|practice> <new-output-directory> [followup-text|practice-module]');
const source = resolve(process.argv[2]); const mode = process.argv[3];
assert.ok(['resume', 'fresh', 'practice'].includes(mode));
const output = resolve(process.argv[4]); const here = dirname(fileURLToPath(import.meta.url));
const practicePath = mode === 'practice' ? resolve(process.argv[5] ?? join(here, 'practice-start.mjs')) : undefined;
const followup = (practicePath === undefined ? process.argv[5] : undefined) ?? 'Without calling a tool, state the ticket id and status from our previous conversation.';
const report = { capturedAt: new Date().toISOString(), mode: mode === 'fresh' ? 'fresh' : 'resume', followup, node: process.version,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(),
  sourceTrackedChanges: execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: source, encoding: 'utf8' }).trim(),
  networkIsolation: { verified: false, scope: 'Loopback provider configuration; no external-network blocking' },
  files: {}, phases: [], cleanup: {} };
assert.equal(report.sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
assert.equal(report.sourceTrackedChanges, '');
for (const file of ['run.mjs', 'inspect.mjs', '../m1/startup-probe.mjs', '../tool-cases/support.mjs',
  '../tool-cases/stages/plugin.mjs', '../first-tool/tickets.mjs']) report.files[file] = sha(await readFile(join(here, file)));
if (practicePath !== undefined) report.practice = { moduleSha256: sha(await readFile(practicePath)) };
await mkdir(dirname(output), { recursive: true }); await mkdir(output);
const root = await mkdtemp(join(tmpdir(), 'book-reentry-'));
const home = join(root, 'home'); const workspace = join(root, 'workspace'); const sessions = join(root, 'sessions');
const audit = join(root, 'execution.jsonl'); const patch = join(root, 'patch.yml');
const loader = pathToFileURL(createRequire(join(source, 'package.json')).resolve('tsx/esm')).href;
const { startMockLlmServer } = await import(pathToFileURL(join(source, 'packages/test-support/llm-mock-server/src/index.ts')).href);
let server; let currentChild; let failure;
const readAudit = async () => {
  try { return (await readFile(audit, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
};
const logs = async (directory = sessions) => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await logs(path));
    else if (/^session.*\.jsonl$/.test(entry.name)) result.push({ path, bytes: await readFile(path) });
  }
  return result;
};
const run = async (name, cwd, sessionId, task, json = false) => {
  const start = server.requests.length; const before = await readAudit();
  const phase = { name, cwd, requestedSessionId: sessionId ?? null, json, watchdogExpired: false };
  report.phases.push(phase);
  const args = ['--import', pathToFileURL(join(here, '../m1/startup-probe.mjs')).href,
    '--import', loader, join(source, 'apps/cli/src/bin.ts'), '--profile', 'headless', '--patch', patch,
    ...json ? ['--json'] : [], ...sessionId === undefined ? [] : ['--session-id', sessionId], task];
  const child = spawn(process.execPath, args, { cwd, windowsHide: true,
    env: { ...process.env, DSH_HOME: home, BOOK_DSH_SOURCE: source, BOOK_EXECUTION_LOG: audit,
      BOOK_STARTUP_LOG: join(output, `${name}-startup.jsonl`), TSX_TSCONFIG_PATH: join(source, 'tsconfig.json'),
      DEEPSEEK_API_KEY: 'book-mock-key', DEEPSEEK_BASE_URL: `${server.baseURL}/v1` },
    stdio: ['ignore', 'pipe', 'pipe'] });
  currentChild = child; phase.pid = child.pid;
  let stdout = ''; let stderr = '';
  child.stdout.on('data', bytes => { stdout += bytes; }); child.stderr.on('data', bytes => { stderr += bytes; });
  const closed = once(child, 'close');
  const timer = setTimeout(() => { phase.watchdogExpired = true; child.kill(); }, 45000);
  try { [phase.exitCode, phase.signal] = await closed; }
  finally { clearTimeout(timer); }
  phase.stdout = stdout; phase.stderr = stderr;
  phase.requestMessages = server.requests.slice(start).map(request => request.body?.messages ?? []);
  phase.executionCount = (await readAudit()).slice(before.length).filter(row => row.type === 'execute').length;
  assert.equal(phase.watchdogExpired, false, `${name}: startup/task watchdog expired; original failure preserved`);
  return phase;
};
try {
  await mkdir(home); await mkdir(workspace);
  const overlay = ['- id: session-title-llm', '  disabled: true', '- id: session-persistence-jsonl', '  config:',
    `    root: ${JSON.stringify(sessions.replaceAll('\\', '/'))}`, '    compression: none',
    '- insert:', '    - id: book-ticket-tool',
    `      name: ${JSON.stringify(join(here, '../tool-cases/stages/plugin.mjs').replaceAll('\\', '/'))}`, ''].join('\n');
  await writeFile(patch, overlay); await writeFile(join(output, 'overlay.yml'), overlay);
  server = await startMockLlmServer({ host: '127.0.0.1', port: 0, apiKey: 'book-mock-key', randomSeed: 1042,
    sequence: ['tool_call_success', 'success', 'success'], repeatLast: false,
    toolName: 'book_ticket_lookup', toolArguments: '{"id":"TK-1042"}', successText: 'Book reentry mock response.' });
  let saved; let launches = 0;
  // The reader chooses both launches. This adapter owns only process/configuration and evidence collection.
  const launch = async (task, { sessionId, json = false } = {}) => {
    assert.ok(launches < 2, 'This exercise owns exactly two sequential launches');
    const name = launches++ === 0 ? 'first' : 'second';
    const phase = await run(name, workspace, sessionId, task, json);
    assert.equal(phase.exitCode, 0, phase.stderr);
    const current = await logs();
    const selected = name === 'first' || sessionId !== undefined ? current.find(entry => saved === undefined || entry.path === saved.path)
      : current.find(entry => entry.path !== saved.path);
    assert.ok(selected, 'Expected the actual invocation to materialize a Session');
    const rows = selected.bytes.toString('utf8').trim().split('\n').map(JSON.parse);
    phase.sessionId = rows[0].id; phase.events = rows.slice(1); phase.header = rows[0];
    phase.durableSha256 = sha(selected.bytes); phase.durableBytes = selected.bytes.length;
    if (name === 'first') { assert.equal(current.length, 1); saved = selected; }
    else phase.oldPrefixSha256 = sha(selected.path === saved.path ? selected.bytes.subarray(0, saved.bytes.length) : await readFile(saved.path));
    await writeFile(join(output, `${name}-durable.jsonl`), selected.bytes);
    return { stdout: phase.stdout, exitCode: phase.exitCode };
  };
  const firstTask = 'Look up TK-1042 with book_ticket_lookup.';
  if (practicePath === undefined) {
    await launch(firstTask);
    await launch(followup, { sessionId: mode === 'resume' ? report.phases[0].sessionId : undefined });
  } else {
    const identityFile = join(root, 'selected-session.json');
    const { practice } = await import(pathToFileURL(practicePath).href);
    await practice({ launch, identityFile, firstTask, followup });
    assert.equal(launches, 2);
    const storedIdentity = await readFile(identityFile);
    report.practice.savedSessionId = JSON.parse(storedIdentity).sessionId;
    report.practice.identityFileSha256 = sha(storedIdentity);
    assert.equal(report.practice.savedSessionId, report.phases[0].sessionId);
    await writeFile(join(output, 'selected-session.json'), storedIdentity);
    for (const phase of report.phases) {
      const opening = phase.stdout.trim().split('\n').map(JSON.parse).find(row => row.type === 'session');
      assert.equal(opening.sessionId, phase.sessionId);
    }
  }
  const first = report.phases[0]; const second = report.phases[1];
  if (report.mode === 'resume') {
    const wrong = join(root, 'different-workspace'); await mkdir(wrong);
    for (const [name, cwd, id] of [['wrong-cwd', wrong, first.sessionId], ['missing-id', workspace, `${first.sessionId}-missing`]]) {
      const phase = await run(name, cwd, id, followup);
      phase.durableUnchanged = sha(await readFile(saved.path)) === second.durableSha256;
    }
  }
} catch (error) { failure = error; report.failure = String(error); }
finally {
  if (currentChild && currentChild.exitCode === null && currentChild.signalCode === null) {
    const closed = once(currentChild, 'close'); currentChild.kill(); await closed;
  }
  report.cleanup.childrenExited = !currentChild || currentChild.exitCode !== null || currentChild.signalCode !== null;
  if (server) { report.requests = server.requests.map(request => ({ behavior: request.behavior, outcome: request.outcome }));
    report.requestsExhausted = server.requests.some(request => request.behavior === 'script_exhausted');
    await server.close(); report.cleanup.mockServerClosed = true; }
  report.executionAudit = await readAudit();
  assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep) && root.includes('book-reentry-'));
  await rm(root, { recursive: true });
  try { await access(root); report.cleanup.temporaryRootRemoved = false; }
  catch (error) { if (error.code !== 'ENOENT') throw error; report.cleanup.temporaryRootRemoved = true; }
  if (!failure) {
    try { report.verification = inspect(report); } catch (error) { failure = error; report.failure = String(error); }
  }
  report.passed = !failure;
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, mode, evidence: output, failure: report.failure }));
if (failure) process.exitCode = 1;
