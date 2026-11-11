// SPDX-License-Identifier: Apache-2.0
/** Run a reader-owned plugin through the real headless profile and preserve fresh evidence. */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert.ok(process.argv[4], 'Usage: run.mjs <source-root> <start|normal> <new-evidence-directory> [plugin-file]');
const source = resolve(process.argv[2]);
const scenario = process.argv[3];
assert.ok(['start', 'normal'].includes(scenario), 'Only start and normal are implemented');
const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.argv[4]);
const plugin = resolve(process.argv[5] ?? join(here, scenario === 'start' ? 'start/plugin.mjs' : 'stages/plugin.mjs'));
const sha = value => createHash('sha256').update(value).digest('hex');
const pluginBytes = await readFile(plugin);
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim();
const sourceTrackedChanges = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: source, encoding: 'utf8' }).trim();
assert.equal(sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159', 'Recheck examples against this source version');
assert.equal(sourceTrackedChanges, '', 'Record and review source edits before this pinned experiment');
const loader = pathToFileURL(createRequire(join(source, 'package.json')).resolve('tsx/esm')).href;
const { startMockLlmServer } = await import(pathToFileURL(join(source, 'packages/test-support/llm-mock-server/src/index.ts')).href);
await mkdir(dirname(output), { recursive: true });
await mkdir(output); // Never overwrite earlier evidence.
const root = await mkdtemp(join(tmpdir(), 'book-tool-cases-'));
const report = { scenario, capturedAt: new Date().toISOString(), sourceCommit, sourceTrackedChanges,
  node: process.version, platform: process.platform, arch: process.arch, plugin,
  files: { plugin: sha(pluginBytes) }, cleanup: {} };
for (const path of ['run.mjs', 'support.mjs', '../first-tool/tickets.mjs']) {
  report.files[path] = sha(await readFile(join(here, path)));
}
let server; let child; let failure;
try {
  const home = join(root, 'home'); const workspace = join(root, 'workspace');
  await mkdir(home); await mkdir(workspace);
  const overlay = ['- id: session-title-llm', '  disabled: true', '- insert:',
    '    - id: book-ticket-tool', `      name: ${JSON.stringify(plugin.replaceAll('\\', '/'))}`, ''].join('\n');
  report.overlay = overlay;
  await writeFile(join(output, 'overlay.yml'), overlay);
  const patch = join(root, 'overlay.yml'); await writeFile(patch, overlay);
  const sequence = scenario === 'start' ? ['success'] : ['tool_call_success', 'success'];
  server = await startMockLlmServer({ host: '127.0.0.1', port: 0, apiKey: 'book-mock-key',
    randomSeed: 1042, sequence, repeatLast: false, toolName: 'book_ticket_lookup',
    toolArguments: '{"id":"TK-1042"}', successText: 'Chapter four completed.' });
  const task = scenario === 'start' ? 'Reply once.' : 'Look up ticket TK-1042 with book_ticket_lookup.';
  report.submittedTask = task;
  const result = await new Promise((accept, reject) => {
    child = spawn(process.execPath, ['--import', loader, join(source, 'apps/cli/src/bin.ts'),
      '--profile', 'headless', '--patch', patch, task], { cwd: workspace, windowsHide: true,
      env: { ...process.env, DSH_HOME: home, BOOK_DSH_SOURCE: source,
        TSX_TSCONFIG_PATH: join(source, 'tsconfig.json'),
        DEEPSEEK_API_KEY: 'book-mock-key', DEEPSEEK_BASE_URL: `${server.baseURL}/v1` },
      stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), 90000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', (code, signal) => { clearTimeout(timer); accept({ code, signal, stdout, stderr }); });
  });
  report.applicationExitCode = result.code; report.signal = result.signal;
  assert.equal(result.code, 0, `Application failed: ${result.stderr.slice(-2000)}`);
  assert.equal(result.stdout, 'Chapter four completed.\n');
  report.terminalStdout = result.stdout;
  assert.deepEqual(server.requests.map(request => request.behavior), sequence);
  const first = server.requests[0].body;
  report.toolSchema = first.tools?.find(tool => tool.name === 'book_ticket_lookup') ?? null;
  if (scenario === 'start') {
    assert.equal(report.toolSchema, null, 'Starting plugin must not advertise the business tool');
  } else {
    assert.ok(report.toolSchema, 'Reader plugin must register the tool');
    const blocks = server.requests[1].body.messages.flatMap(message => Array.isArray(message.content) ? message.content : []);
    const call = blocks.find(block => block.type === 'tool_use' && block.name === 'book_ticket_lookup');
    assert.ok(call); assert.deepEqual(call.input, { id: 'TK-1042' });
    const value = blocks.find(block => block.type === 'tool_result' && block.tool_use_id === call.id);
    assert.ok(value); assert.ok(!value.is_error);
    assert.deepEqual(JSON.parse(value.content[0].text), { id: 'TK-1042', status: 'open', title: 'Invoice export failed' });
    report.observedToolCall = call; report.observedToolResult = value;
  }
} catch (error) { failure = error; report.failure = String(error); }
finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const closed = once(child, 'close'); child.kill(); await closed;
  }
  if (server) { await server.close(); report.cleanup.mockServerClosed = true; }
  else { report.cleanup.mockServerNotStarted = true; }
  report.cleanup.childExited = !child || child.exitCode !== null || child.signalCode !== null;
  await rm(root, { recursive: true });
  try { await access(root); report.cleanup.temporaryRootRemoved = false; }
  catch (error) { if (error.code !== 'ENOENT') throw error; report.cleanup.temporaryRootRemoved = true; }
  report.requests = server?.requests.map(request => ({ attempt: request.attempt, behavior: request.behavior, outcome: request.outcome }));
  report.passed = !failure && Object.values(report.cleanup).every(Boolean);
  await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ passed: report.passed, evidence: output }));
if (!report.passed) process.exitCode = 1;
