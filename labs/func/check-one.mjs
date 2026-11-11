// SPDX-License-Identifier: Apache-2.0
/** 先按第三章补好 starter.mjs，再用这一条断言检查状态。 */
import assert from 'node:assert/strict';
import { lookupTicket } from './starter.mjs';

const ticket = lookupTicket('TK-1042');
assert.equal(ticket.status, 'open');
console.log('状态检查通过');
