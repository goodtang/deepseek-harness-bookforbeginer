// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { lookupTicket } from './tickets.mjs';

const source = resolve(process.argv[2] ?? '../deepseek-harness-local');
const here = dirname(fileURLToPath(import.meta.url));
const evidence = resolve(process.argv[3] ?? join(here, '.lab-runtime/evidence.json'));
const requireSource = createRequire(join(source, 'package.json'));
const loader = pathToFileURL(requireSource.resolve('tsx/esm')).href;
// The runner itself must also start with this source checkout's tsx loader.
const { startMockLlmServer } = await import(pathToFileURL(join(
  source, 'packages/test-support/llm-mock-server/src/index.ts',
)).href);
const root = await mkdtemp(join(tmpdir(), 'dsh-book-first-tool-'));
const home = join(root, 'home');
const workspace = join(root, 'workspace');
const report = {
  scenario: 'E1-normal-tool-cycle', capturedAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(),
  sourceTrackedChanges: execFileSync('git', ['status', '--porcelain', '--untracked-files=no'],
    { cwd: source, encoding: 'utf8' }).trim(),
  node: process.version, assertions: [], exitCode: null, cleanup: {},
};
report.labFiles = Object.fromEntries(await Promise.all(['run.mjs', 'plugin.mjs', 'tickets.mjs'].map(async name =>
  [name, createHash('sha256').update(await readFile(join(here, name))).digest('hex')])));
let server;
let child;
let failure;
try {
  await mkdir(home);
  await mkdir(workspace);
  const overlay = join(root, 'tool.patch.yml');
  await writeFile(overlay, [
    '- id: session-title-llm', '  disabled: true', '- insert:',
    '    - id: book-ticket-tool',
    `      name: ${JSON.stringify(join(here, 'plugin.mjs').replaceAll('\\', '/'))}`, '',
  ].join('\n'));
  server = await startMockLlmServer({
    host: '127.0.0.1', port: 0, apiKey: 'book-mock-key', randomSeed: 1042,
    sequence: ['tool_call_success', 'success'], repeatLast: false,
    toolName: 'book_ticket_lookup', toolArguments: '{"id":"TK-1042"}',
    successText: 'Ticket lookup completed.',
  });
  const result = await new Promise((accept, reject) => {
    child = spawn(process.execPath, ['--import', loader, join(source, 'apps/cli/src/bin.ts'),
      '--profile', 'headless', '--patch', overlay, 'Look up ticket TK-1042 with book_ticket_lookup.'], {
      cwd: workspace, windowsHide: true,
      env: { ...process.env, DSH_HOME: home, BOOK_DSH_SOURCE: source,
        TSX_TSCONFIG_PATH: join(source, 'tsconfig.json'),
        DEEPSEEK_API_KEY: 'book-mock-key', DEEPSEEK_BASE_URL: `${server.baseURL}/v1` },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timeout = setTimeout(() => { child.kill(); }, 90000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('close', (code, signal) => {
      clearTimeout(timeout); accept({ code, signal, stdout, stderr });
    });
  });
  report.exitCode = result.code;
  report.signal = result.signal;
  // Console text may contain local paths; wire evidence below publishes only synthetic facts.
  if (result.code !== 0) process.stderr.write(result.stderr.slice(-8000));
  assert.equal(result.code, 0, 'headless must exit successfully');
  report.assertions.push('headless exit code is zero');
  assert.deepEqual(server.requests.map(r => r.behavior), ['tool_call_success', 'success']);
  report.assertions.push('exactly two scripted requests; no script exhaustion');
  const first = server.requests[0].body;
  const second = server.requests[1].body;
  const toolSchema = first.tools.find(tool => tool.name === 'book_ticket_lookup');
  assert.ok(toolSchema, 'registered tool is model-visible');
  report.toolSchema = toolSchema;
  const blocks = second.messages.flatMap(message => Array.isArray(message.content) ? message.content : []);
  const resultBlock = blocks.find(block => block.type === 'tool_result' && !block.is_error
    && JSON.stringify(block.content).includes('Invoice export failed'));
  assert.ok(resultBlock, 'real tool result must reach the next model request');
  const call = blocks.find(block => block.type === 'tool_use' && block.name === 'book_ticket_lookup');
  assert.ok(call);
  assert.equal(resultBlock.tool_use_id, call.id);
  assert.deepEqual(call.input, { id: 'TK-1042' });
  assert.deepEqual(JSON.parse(resultBlock.content[0].text), {
    id: 'TK-1042', status: 'open', title: 'Invoice export failed',
  });
  assert.equal(lookupTicket('missing'), null);
  assert.equal(lookupTicket('__proto__'), null);
  const copy = lookupTicket('TK-1042'); copy.status = 'closed';
  assert.equal(lookupTicket('TK-1042').status, 'open');
  report.assertions.push('registered execution returned the known ticket to the next request',
    'missing lookup returns null; returned copies cannot mutate fixture');
  report.requests = server.requests.map(request => ({
    attempt: request.attempt, behavior: request.behavior, outcome: request.outcome,
    chunksSent: request.chunksSent, path: request.path,
  }));
  report.observedToolResult = resultBlock;
} catch (error) {
  failure = error;
  report.failure = String(error);
  report.requests = server?.requests.map(r => ({ attempt: r.attempt, behavior: r.behavior, outcome: r.outcome }));
} finally {
  if (server) { await server.close(); report.cleanup.mockServerClosed = true; }
  report.cleanup.childExited = !child || child.exitCode !== null || child.signalCode !== null;
  await rm(root, { recursive: true, force: true });
  try { await access(root); report.cleanup.temporaryRootRemoved = false; }
  catch (error) { if (error.code !== 'ENOENT') throw error; report.cleanup.temporaryRootRemoved = true; }
  report.passed = !failure && Object.values(report.cleanup).every(Boolean);
  await mkdir(dirname(evidence), { recursive: true });
  await writeFile(evidence, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ passed: report.passed, evidence, requests: report.requests?.length }));
if (!report.passed) process.exitCode = 1;
