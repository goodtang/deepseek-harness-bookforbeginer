// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startBusiness } from './business.mjs';
import { transition, commandOf } from './domain.mjs';

test('the actual HTTP service runs the selected business rule before committing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'book-rule-test-'));
  const principal = { id: 'student-01', tenantId: 'classroom-A', canClose: true };
  let business;
  try {
    business = await startBusiness({ file: join(root, 'business.json'), principal, ticketTitle: '   ',
      transition(state, command, actor) {
        if (!state.ticket.title.trim()) return { state: 'not-written', operationId: command.operationId, code: 'TITLE_REQUIRED' };
        return transition(state, command, actor);
      },
    });
    const command = commandOf({ id: 'TK-1042', expectedVersion: 1, operationId: 'close-1042-01' }, principal);
    const response = await fetch(`${business.baseURL}/close`, { method: 'POST',
      headers: { authorization: `Bearer ${business.token}`, 'content-type': 'application/json' }, body: JSON.stringify(command) });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'TITLE_REQUIRED');
    assert.equal(business.snapshot().ticket.title, '   ');
    assert.equal(business.snapshot().writeCount, 0);
    assert.deepEqual(business.snapshot().operations, {});
  } finally {
    if (business) await business.close();
    await rm(root, { recursive: true });
  }
});
