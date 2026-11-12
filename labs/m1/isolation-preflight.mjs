// SPDX-License-Identifier: Apache-2.0
/** Read-only Windows capability inventory; availability never counts as a verified network block. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
assert.ok(process.argv[2], 'Usage: isolation-preflight.mjs <new-report-file>');
assert.equal(process.platform, 'win32', 'This preflight inventories Windows hosts only');
const decode = bytes => bytes.includes(0) ? bytes.toString('utf16le') : bytes.toString('utf8');
const tools = {};
for (const name of ['docker', 'podman', 'wsl', 'WindowsSandbox']) {
  const found = spawnSync('where.exe', [name], { windowsHide: true });
  tools[name] = { found: found.status === 0, paths: decode(found.stdout).trim().split(/\r?\n/).filter(Boolean) };
}
if (tools.wsl.found) {
  const result = spawnSync('wsl.exe', ['--list', '--quiet'], { windowsHide: true, timeout: 10000 });
  tools.wsl.inventory = { exitCode: result.status, stdout: decode(result.stdout), stderr: decode(result.stderr) };
}
const help = spawnSync(process.execPath, ['--help'], { windowsHide: true, encoding: 'utf8' });
const report = { capturedAt: new Date().toISOString(), platform: process.platform, node: process.version, tools,
  nodeAllowNetOption: help.stdout.includes('--allow-net'),
  networkIsolationVerified: false,
  nextRequirement: 'Run all scenarios in an independently verified environment that blocks external traffic and permits only required loopback communication; this inventory does not establish one',
  systemConfigurationChanged: false };
const output = resolve(process.argv[2]); await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ output, networkIsolationVerified: false }));
