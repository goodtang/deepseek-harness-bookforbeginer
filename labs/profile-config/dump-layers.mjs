// SPDX-License-Identifier: Apache-2.0
/** Exercise the public config dump against an owned home; never evaluate tagged expressions. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, sep, basename, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const [sourceArg, outputArg] = process.argv.slice(2);
assert.ok(sourceArg && outputArg, 'Usage: dump-layers.mjs <Harness-root> <new-evidence-directory>');
const source = resolve(sourceArg); const output = resolve(outputArg);
const require = createRequire(join(source, 'package.json'));
const yaml = require('js-yaml');
const schema = yaml.DEFAULT_SCHEMA.extend(new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: expression => ({ expression }) }));
const loader = pathToFileURL(require.resolve('tsx/esm')).href;
const run = promisify(execFile); const sha = b => createHash('sha256').update(b).digest('hex');
await mkdir(dirname(output), { recursive: true }); await mkdir(output, { recursive: false });
const root = await mkdtemp(join(tmpdir(), 'book-config-layers-'));
const home = join(root, 'home'); const profile = join(home, 'profiles/headless');
const sourceCommit = (await run('git', ['rev-parse', 'HEAD'], { cwd: source })).stdout.trim();
assert.equal(sourceCommit, 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
assert.equal((await run('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: source })).stdout.trim(), '');
const summary = { sourceCommit, capturedAt: new Date().toISOString(), stages: [], cleanup: {}, jsEvaluated: false };
const cli = async (name, flags) => {
  const { stdout, stderr } = await run(process.execPath, ['--import', loader, join(source, 'apps/cli/src/bin.ts'), '--profile', 'headless', ...flags],
    { cwd: root, windowsHide: true, timeout: 45000, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, DSH_HOME: home, TSX_TSCONFIG_PATH: join(source, 'tsconfig.json') } });
  await writeFile(join(output, `${name}.yml`), stdout); await writeFile(join(output, `${name}-stderr.txt`), stderr);
  const rows = yaml.load(stdout, { schema });
  const find = entries => entries.flatMap(row => [row, ...(row.group && Array.isArray(row.config) ? find(row.config) : [])]);
  const own = find(rows).find(row => row.id === 'book-ticket-tool');
  const stage = { name, dumpSha256: sha(stdout), businessRow: own ?? null, warning: stderr.trim() };
  summary.stages.push(stage); return stage;
};
try {
  await mkdir(home);
  await cli('default', ['--dump-default-config']);
  summary.bundles = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')).dsh.profile.bundles;
  assert.deepEqual(summary.bundles, ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-headless']);
  const modulePath = fileURLToPath(new URL('./entry.mjs', import.meta.url)).replaceAll('\\', '/');
  await writeFile(join(profile, 'cordis.patch.yml'), `- insert:\n    - id: book-ticket-tool\n      name: ${JSON.stringify(modulePath)}\n      config:\n        source: memory\n        path: profile-only.json\n`);
  assert.deepEqual((await cli('profile', ['--dump-config'])).businessRow.config, { source: 'memory', path: 'profile-only.json' });
  await writeFile(join(home, 'cordis.patch.yml'), '- id: book-ticket-tool\n  config:\n    source: memory\n');
  assert.deepEqual((await cli('home', ['--dump-config'])).businessRow.config, { source: 'memory' });
  const first = join(root, 'first.yml'); const second = join(root, 'second.yml');
  await writeFile(first, '- id: book-ticket-tool\n  config:\n    source: file\n    path: cli-only.json\n');
  await writeFile(second, '- id: book-ticket-tool\n  config:\n    source: memory\n');
  assert.deepEqual((await cli('first-overlay', ['--patch', first, '--dump-config'])).businessRow.config, { source: 'file', path: 'cli-only.json' });
  assert.deepEqual((await cli('second-overlay', ['--patch', first, '--patch', second, '--dump-config'])).businessRow.config, { source: 'memory' });
  const typo = join(root, 'typo.yml'); await writeFile(typo, '- id: book-ticket-tools\n  disabled: true\n');
  const miss = await cli('unknown-id', ['--patch', typo, '--dump-config']);
  assert.ok(miss.warning.includes('book-ticket-tools') && miss.warning.includes('not found'));
  assert.deepEqual(miss.businessRow.config, { source: 'memory' });
  await writeFile(second, '- id: book-ticket-tool\n  config:\n    source: memory\n    probe: !!js (() => { throw new Error("BOOK_JS_MUST_NOT_RUN"); })()\n');
  const literal = await cli('expression', ['--patch', second, '--dump-config']);
  assert.ok(literal.businessRow.config.probe.expression.includes('BOOK_JS_MUST_NOT_RUN'));
  await writeFile(join(profile, 'cordis.patch.yml'), '- id: [broken');
  try { await cli('default-with-patch', ['--patch', typo, '--dump-default-config']); assert.fail('Default dump accepted --patch'); }
  catch (error) {
    assert.equal(error.code, 1); assert.ok(String(error.stderr).includes('takes no --patch'));
    await writeFile(join(output, 'default-with-patch-stderr.txt'), String(error.stderr));
    summary.defaultWithPatchExit = error.code;
  }
  const recovery = await cli('broken-user-default', ['--dump-default-config']);
  assert.equal(recovery.businessRow, null); assert.equal(recovery.warning, '');
  try { await cli('broken-user-effective', ['--dump-config']); assert.fail('Broken profile patch was accepted'); }
  catch (error) {
    assert.equal(error.code, 1); assert.equal(error.killed, false);
    assert.ok(String(error.stderr).includes('cordis.patch.yml'));
    await writeFile(join(output, 'broken-user-effective-stderr.txt'), String(error.stderr));
    summary.brokenUserEffectiveExit = error.code;
  }
} finally {
  assert.ok(root.startsWith(resolve(tmpdir()) + sep) && basename(root).startsWith('book-config-layers-'));
  await rm(root, { recursive: true });
  try { await access(root); summary.cleanup.temporaryRootRemoved = false; }
  catch (error) { if (error.code !== 'ENOENT') throw error; summary.cleanup.temporaryRootRemoved = true; }
}
assert.equal(summary.cleanup.temporaryRootRemoved, true);
await writeFile(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ stages: summary.stages.length, bundles: summary.bundles, cleanup: summary.cleanup }));
