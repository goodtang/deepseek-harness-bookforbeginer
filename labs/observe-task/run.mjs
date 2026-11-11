// SPDX-License-Identifier: Apache-2.0
/** Run the existing real-profile lab and present its evidence for chapter one. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.argv[2] ?? '../deepseek-harness-local');
const output = resolve(process.argv[3] ?? join(here, '.lab-runtime'));
const runner = resolve(here, '../first-tool/run.mjs');
const sha = value => createHash('sha256').update(value).digest('hex');

try {
  const loader = pathToFileURL(createRequire(join(source, 'package.json')).resolve('tsx/esm')).href;
  await mkdir(output, { recursive: true });
  const evidencePath = join(output, 'run-evidence.json');
  // Each run must produce new evidence; an old successful file cannot satisfy a failed child.
  const result = await new Promise((accept, reject) => {
    const child = spawn(process.execPath, ['--import', loader, runner, source, evidencePath], {
      cwd: source, windowsHide: true,
      env: { ...process.env, TSX_TSCONFIG_PATH: join(source, 'tsconfig.json') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', code => accept({ code, stdout, stderr }));
  });
  if (result.code !== 0) process.stderr.write(result.stderr);
  assert.equal(result.code, 0, '实验运行器失败；不能使用旧证据判定本次通过');
  const raw = await readFile(evidencePath);
  const evidence = JSON.parse(raw);
  assert.equal(evidence.passed, true);
  assert.equal(evidence.exitCode, 0);
  assert.equal(evidence.terminalStdout, 'Ticket lookup completed.\n');
  assert.deepEqual(evidence.observedToolCall.input, { id: 'TK-1042' });
  assert.equal(evidence.observedToolCall.id, evidence.observedToolResult.tool_use_id);
  assert.deepEqual(evidence.requests.map(r => r.behavior), ['tool_call_success', 'success']);
  assert.ok(evidence.requests.every(r => r.outcome === 'completed'));
  assert.equal(evidence.toolSchema.name, 'book_ticket_lookup');
  assert.equal(evidence.observedToolResult.is_error, false);
  const ticket = JSON.parse(evidence.observedToolResult.content[0].text);
  assert.deepEqual(ticket, { id: 'TK-1042', status: 'open', title: 'Invoice export failed' });
  assert.ok(Object.values(evidence.cleanup).every(Boolean));
  // The inner runner verifies the call's arguments and identity against the captured request.
  assert.ok(evidence.assertions.includes('registered execution returned the known ticket to the next request'));
  for (const [name, digest] of Object.entries(evidence.labFiles)) {
    assert.equal(sha(await readFile(resolve(here, '../first-tool', name))), digest);
  }
  const lines = [
    '观察记录（运行结束后依据请求和断言整理，非实时日志）',
    '任务：用 book_ticket_lookup 查询工单 TK-1042。',
    '模型：本机脚本化模拟服务；不需要真实模型密钥。',
    '1. 首次模型请求包含工具定义：book_ticket_lookup。',
    '2. 调用参数与调用编号已由运行器核对：id=TK-1042。',
    `3. 工具结果：id=${ticket.id}, status=${ticket.status}, title=${ticket.title}。`,
    '4. 后续模型请求已经携带与该调用对应的非错误工具结果。',
    '5. 两次模型请求均完成；实际终端答复另存 terminal-stdout.txt。',
    '6. 退出码=0；模拟服务关闭、直接子进程退出、临时目录删除。',
    '结论：正常查询路径的独立断言通过；不代表真实模型业务能力通过。',
  ];
  const observation = `${lines.join('\n')}\n`;
  await writeFile(join(output, 'observation.txt'), observation);
  await writeFile(join(output, 'terminal-stdout.txt'), evidence.terminalStdout);
  await writeFile(join(output, 'observation.json'), `${JSON.stringify({
    chapter: 'CH-OBS', capturedAt: new Date().toISOString(),
    sourceCommit: evidence.sourceCommit, evidence: 'run-evidence.json',
    runEvidenceSha256: sha(raw), observationSha256: sha(observation),
    terminalStdout: 'terminal-stdout.txt', terminalStdoutSha256: sha(evidence.terminalStdout),
    observerSha256: sha(await readFile(fileURLToPath(import.meta.url))),
    presentation: 'Post-run evidence summary, not live events or a new runtime event type',
    passed: true,
  }, null, 2)}\n`);
  process.stdout.write(observation);
  console.log('以下为 headless 标准输出原文：');
  process.stdout.write(evidence.terminalStdout);
  console.log(`本次证据目录：${output}`);
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
