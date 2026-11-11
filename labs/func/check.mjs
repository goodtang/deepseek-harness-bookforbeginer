// SPDX-License-Identifier: Apache-2.0
/** 只读断言：导入指定文件的 lookupTicket，核对"找到 / 找不到 / 返回副本"三项行为。 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const target = process.argv[2] ?? './starter.mjs';
const mod = await import(pathToFileURL(resolve(target)).href);
const lookupTicket = mod.lookupTicket;
if (typeof lookupTicket !== 'function') {
  console.error('在 ' + target + ' 中没有找到导出的 lookupTicket 函数。');
  process.exit(1);
}

const report = { target, checks: [], passed: false };
function check(name, fn) {
  try { fn(); report.checks.push({ name, passed: true }); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); }
}

check('查 TK-1042 得到 open 的发票导出失败工单', () => {
  assert.deepEqual(lookupTicket('TK-1042'), { id: 'TK-1042', status: 'open', title: 'Invoice export failed' });
});
check('查不存在的编号得到 null', () => {
  assert.equal(lookupTicket('missing'), null);
});
check('改了返回结果，原记录不变', () => {
  const copy = lookupTicket('TK-1042');
  copy.status = 'closed';
  assert.equal(lookupTicket('TK-1042').status, 'open');
});

report.passed = report.checks.every((c) => c.passed);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed ? 0 : 1;
