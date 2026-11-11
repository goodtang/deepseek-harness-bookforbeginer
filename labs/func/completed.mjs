// SPDX-License-Identifier: Apache-2.0
/** 第三章完成快照：普通编号的查询与字符串字段记录副本；原型键处理见后续工具示例。 */
const tickets = {
  'TK-1042': { id: 'TK-1042', status: 'open', title: 'Invoice export failed' },
};

export function lookupTicket(id) {
  const ticket = tickets[id];
  return ticket ? { ...ticket } : null;
}
