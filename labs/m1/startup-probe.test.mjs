// SPDX-License-Identifier: Apache-2.0
/** Check preload exit behavior, an observable heartbeat, and opt-in import tracing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const probe = new URL('./startup-probe.mjs', import.meta.url).href;

async function run(body, trace, observeHeartbeat = false) {
  const root = await mkdtemp(join(tmpdir(), 'book-probe-test-'));
  const path = join(root, 'startup.jsonl');
  const child = spawn(process.execPath, ['--import', probe, '--input-type=module', '-e', body], {
    env: { ...process.env, BOOK_STARTUP_LOG: path, BOOK_TRACE_IMPORTS: trace ? '1' : '0' },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const closed = once(child, 'close');
  let stderr = ''; child.stderr.on('data', bytes => { stderr += bytes; });
  let watchdog; let poll;
  try {
    const deadline = new Promise((_, reject) => {
      watchdog = setTimeout(() => reject(new Error('Preload contract did not settle')), 10000);
    });
    if (observeHeartbeat) {
      const heartbeat = new Promise((accept, reject) => {
        poll = setInterval(async () => {
          try {
            const bytes = await readFile(path, 'utf8');
            const complete = bytes.slice(0, bytes.lastIndexOf('\n')).split('\n').filter(Boolean).map(JSON.parse);
            if (complete.some(row => row.phase === 'startup-heartbeat')) accept();
          } catch (error) { if (error.code !== 'ENOENT') reject(error); }
        }, 50);
      });
      await Promise.race([heartbeat, closed.then(() => { throw new Error(`Child exited before heartbeat: ${stderr}`); }), deadline]);
      clearInterval(poll); child.kill(); await closed;
    } else {
      const [code] = await Promise.race([closed, deadline]); assert.equal(code, 0, stderr);
    }
    return (await readFile(path, 'utf8')).trim().split('\n').map(JSON.parse);
  } finally {
    clearTimeout(watchdog); clearInterval(poll);
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed; }
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + '\\') || resolve(root).startsWith(resolve(tmpdir()) + '/'));
    await rm(root, { recursive: true });
  }
}

test('preload allows a completed child to exit without waiting for its timer', async () => {
  const rows = await run('', false); assert.equal(rows[0].phase, 'node-preload');
});
test('an active child produces a heartbeat without exposing environment values', async () => {
  const rows = await run('setInterval(() => {}, 1000)', false, true);
  const heartbeat = rows.find(row => row.phase === 'startup-heartbeat');
  assert.ok(heartbeat); assert.equal(typeof heartbeat.uptimeMs, 'number');
  assert.ok(!Object.hasOwn(heartbeat, 'env')); assert.ok(!Object.hasOwn(heartbeat, 'environmentVariables'));
});
test('import tracing is emitted only when explicitly requested', async () => {
  const body = "await import('data:text/javascript,export default 1')";
  const plain = await run(body, false); assert.ok(!plain.some(row => row.phase === 'load-start'));
  const traced = await run(body, true);
  assert.ok(traced.some(row => row.phase === 'load-start'));
  assert.ok(traced.some(row => row.phase === 'load-end'));
});
