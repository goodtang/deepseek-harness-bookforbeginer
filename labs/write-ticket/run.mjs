// SPDX-License-Identifier: Apache-2.0
/** Resolve the real source launcher dependencies without installing anything in the book. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
assert.ok(process.argv[2] && process.argv[3] && process.argv[4], 'Usage: run.mjs <Harness-root> <case> <new-evidence-directory>');
const source = resolve(process.argv[2]);
const loader = pathToFileURL(createRequire(join(source, 'package.json')).resolve('tsx/esm')).href;
const invocation = [source, process.argv[3], resolve(process.argv[4])];
const child = spawn(process.execPath, ['--import', loader, fileURLToPath(new URL('./driver.mjs', import.meta.url)), ...invocation],
  { cwd: source, windowsHide: true, stdio: 'inherit' });
const [code] = await once(child, 'close'); process.exitCode = code ?? 1;
