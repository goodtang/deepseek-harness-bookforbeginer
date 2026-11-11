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

assert.ok(process.argv[4], 'Usage: run.mjs <source-root> <scenario> <new-evidence-directory> [plugin-file]');
const source = resolve(process.argv[2]);
const scenario = process.argv[3];
assert.ok(['start', 'normal', 'missing', 'invalid-argument', 'unregistered', 'audit-loss',
  'inventory-zero', 'inventory-missing', 'inventory-positive'].includes(scenario), 'Unknown scenario');
const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.argv[4]);
const inventory = scenario.startsWith('inventory-');
const absent = ['start', 'unregistered'].includes(scenario);
const toolName = inventory ? 'book_inventory_lookup' : 'book_ticket_lookup';
const input = inventory ? { sku: scenario === 'inventory-missing' ? 'SKU-missing' : scenario === 'inventory-positive' ? 'SKU-1002' : 'SKU-1001' } :
  { id: scenario === 'missing' ? 'missing' : scenario === 'invalid-argument' ? 1042 : 'TK-1042' };
const plugin = resolve(process.argv[5] ?? join(here, absent ? 'start/plugin.mjs' : inventory ? 'inventory-plugin.mjs' : 'stages/plugin.mjs'));
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
for (const path of ['run.mjs', 'support.mjs', '../first-tool/tickets.mjs', ...(inventory ? ['inventory.mjs'] : [])]) {
  report.files[path] = sha(await readFile(join(here, path)));
}
let server; let child; let failure;
try {
  const home = join(root, 'home'); const workspace = join(root, 'workspace');
  await mkdir(home); await mkdir(workspace);
  const auditPath = join(root, 'execution.jsonl');
  const overlay = ['- id: session-title-llm', '  disabled: true', '- insert:',
    '    - id: book-ticket-tool', `      name: ${JSON.stringify(plugin.replaceAll('\\', '/'))}`, ''].join('\n');
  report.overlay = overlay;
  await writeFile(join(output, 'overlay.yml'), overlay);
  const patch = join(root, 'overlay.yml'); await writeFile(patch, overlay);
  const sequence = scenario === 'start' ? ['success'] : ['tool_call_success', 'success'];
  server = await startMockLlmServer({ host: '127.0.0.1', port: 0, apiKey: 'book-mock-key',
    randomSeed: 1042, sequence, repeatLast: false, toolName,
    toolArguments: JSON.stringify(input), successText: 'Chapter four completed.' });
  const task = scenario === 'start' ? 'Reply once.' : `Use ${toolName} with ${JSON.stringify(input)}.`;
  report.submittedTask = task;
  const result = await new Promise((accept, reject) => {
    child = spawn(process.execPath, ['--import', loader, join(source, 'apps/cli/src/bin.ts'),
      '--profile', 'headless', '--patch', patch, task], { cwd: workspace, windowsHide: true,
      env: { ...process.env, DSH_HOME: home, BOOK_DSH_SOURCE: source,
        BOOK_EXECUTION_LOG: auditPath,
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
  report.toolSchema = first.tools?.find(tool => tool.name === toolName) ?? null;
  if (absent) {
    assert.equal(report.toolSchema, null, 'Starting plugin must not advertise the business tool');
  } else {
    assert.ok(report.toolSchema, 'Reader plugin must register the tool');
  }
  if (scenario !== 'start') {
    const blocks = server.requests[1].body.messages.flatMap(message => Array.isArray(message.content) ? message.content : []);
    const call = blocks.find(block => block.type === 'tool_use' && block.name === toolName);
    assert.ok(call); assert.deepEqual(call.input, input);
    const value = blocks.find(block => block.type === 'tool_result' && block.tool_use_id === call.id);
    assert.ok(value);
    if (['invalid-argument', 'unregistered'].includes(scenario)) {
      assert.equal(value.is_error, true, 'Invalid or unknown calls must have an error result');
    } else {
      assert.ok(!value.is_error);
      const expected = ['missing', 'inventory-missing'].includes(scenario) ? null : inventory ?
        { sku: input.sku, name: scenario === 'inventory-positive' ? 'Pen' : 'Notebook', stock: scenario === 'inventory-positive' ? 12 : 0 } :
        { id: 'TK-1042', status: 'open', title: 'Invoice export failed' };
      assert.deepEqual(JSON.parse(value.content[0].text), expected);
    }
    report.observedToolCall = call; report.observedToolResult = value;
  }
  if (scenario === 'audit-loss') {
    await rm(auditPath); report.auditFaultInjected = 'removed execution log after real execution';
  }
  const audit = (await readFile(auditPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(audit.filter(event => event.type === 'ready').length, 1, 'Execution recorder must initialize');
  const executions = audit.filter(event => event.type === 'execute');
  const expectedCount = ['start', 'invalid-argument', 'unregistered'].includes(scenario) ? 0 : 1;
  assert.equal(executions.length, expectedCount, 'Unexpected execute entry count');
  if (executions.length) { assert.equal(executions[0].tool, toolName); assert.deepEqual(executions[0].input, input); }
  report.executionAudit = audit; report.executeCount = executions.length;
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
