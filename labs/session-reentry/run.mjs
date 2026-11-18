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
  'Usage: run.mjs <source-root> <resume|fresh> <new-output-directory> [followup-text]');
const source = resolve(process.argv[2]); const mode = process.argv[3];
assert.ok(['resume', 'fresh'].includes(mode));
const output = resolve(process.argv[4]); const here = dirname(fileURLToPath(import.meta.url));
const followup = process.argv[5] ?? 'Without calling a tool, state the ticket id and status from our previous conversation.';
const report = { capturedAt: new Date().toISOString(), mode, followup, node: process.version,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(),
  sourceTrackedChanges: execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: source, encoding: 'utf8' }).trim(),
  networkIsolation: { verified: false, scope: 'Loopback provider configuration; no external-network blocking' },
  files: {}, phases: [], cleanup: {} };
assert.equal(report.sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
assert.equal(report.sourceTrackedChanges, '');
for (const file of ['run.mjs', 'inspect.mjs', '../m1/startup-probe.mjs', '../tool-cases/support.mjs',
  '../tool-cases/stages/plugin.mjs', '../first-tool/tickets.mjs']) report.files[file] = sha(await readFile(join(here, file)));
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
const run = async (name, cwd, sessionId, task) => {
  const start = server.requests.length; const before = await readAudit();
  const phase = { name, cwd, requestedSessionId: sessionId ?? null, watchdogExpired: false };
  report.phases.push(phase);
  const args = ['--import', pathToFileURL(join(here, '../m1/startup-probe.mjs')).href,
    '--import', loader, join(source, 'apps/cli/src/bin.ts'), '--profile', 'headless', '--patch', patch,
    ...sessionId === undefined ? [] : ['--session-id', sessionId], task];
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
  const first = await run('first', workspace, undefined, 'Look up TK-1042 with book_ticket_lookup.');
  assert.equal(first.exitCode, 0, first.stderr);
  const initial = await logs(); assert.equal(initial.length, 1);
  const saved = initial[0]; const rows = saved.bytes.toString('utf8').trim().split('\n').map(JSON.parse);
  first.sessionId = rows[0].id; first.events = rows.slice(1); first.durableSha256 = sha(saved.bytes);
  first.durableBytes = saved.bytes.length; first.header = rows[0];
  await writeFile(join(output, 'first-durable.jsonl'), saved.bytes);
  const second = await run('second', workspace, mode === 'resume' ? first.sessionId : undefined, followup);
  assert.equal(second.exitCode, 0, second.stderr);
  const after = await logs(); assert.equal(after.length, mode === 'resume' ? 1 : 2);
  const selected = mode === 'resume' ? after[0] : after.find(entry => entry.path !== saved.path);
  const finalRows = selected.bytes.toString('utf8').trim().split('\n').map(JSON.parse);
  second.sessionId = finalRows[0].id; second.events = finalRows.slice(1); second.header = finalRows[0];
  second.oldPrefixSha256 = sha(mode === 'resume' ? selected.bytes.subarray(0, saved.bytes.length) : await readFile(saved.path));
  second.durableSha256 = sha(selected.bytes); second.durableBytes = selected.bytes.length;
  await writeFile(join(output, 'second-durable.jsonl'), selected.bytes);
  if (mode === 'resume') {
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
