// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecords } from './file-data.mjs';

const ticket = { id: 'TK-1042', status: 'open', title: 'Invoice export failed' };
test('JSON data admits the same fictional ticket fields', () => assert.deepEqual(parseRecords(JSON.stringify([ticket])), [ticket]));
for (const [name, value] of [
  ['invalid JSON', '{'], ['non-array root', JSON.stringify(ticket)],
  ['missing field', JSON.stringify([{ id: 'TK-1042', status: 'open' }])],
  ['wrong field type', JSON.stringify([{ ...ticket, status: 7 }])],
  ['duplicate identity', JSON.stringify([ticket, ticket])],
  ['unrecognized field', JSON.stringify([{ ...ticket, password: 'fictional-extra-field' }])],
]) test(`file data rejects ${name}`, () => assert.throws(() => parseRecords(value)));
