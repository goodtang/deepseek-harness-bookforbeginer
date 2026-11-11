// SPDX-License-Identifier: Apache-2.0
/** Read-only checks for the specific source revision used in chapter two. */
import { access, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

try {
  if (!process.argv[2]) throw new Error('请在脚本后给出源码仓库的绝对路径。');
  const source = resolve(process.argv[2]);
  const manifest = join(source, 'package.json');
  let text;
  try { text = await readFile(manifest, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    throw new Error('找不到源码目录下的 package.json；请检查路径，勿把书稿目录当作源码目录。');
  }
  const pkg = JSON.parse(text);
  if (pkg.name !== '@deepseek-ai/dsh-root') throw new Error('此目录不是本书目标 DeepSeek Harness 工程的根目录。');
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim();
  if (revision !== 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159') {
    throw new Error('源码提交与本章基线不符；请核对新下载的学习副本，不要覆盖已有工作。');
  }
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 24 || (major === 24 && minor < 9)) throw new Error('Node 版本不满足本章源码要求 >=24.9.0。');
  await access(join(source, 'apps/cli/src/bin.ts'));
  try { createRequire(manifest).resolve('tsx/esm'); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    throw new Error('无法解析源码依赖 tsx；先在源码目录完成依赖准备，再重试。');
  }
  console.log(`Node：${process.version}（满足 ${pkg.engines.node}）`);
  console.log(`目标工程：${pkg.name}`);
  console.log(`源码提交：${revision}`);
  console.log(`pnpm 声明：${pkg.packageManager}（声明值，不是安装检查）`);
  console.log('tsx 启动依赖：可解析');
  console.log('预检通过；完整依赖与构建是否可用，还要实际运行观察实验。');
} catch (error) {
  console.error(`预检失败：${error.message}`);
  process.exitCode = 1;
}
