// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, commandOf, fingerprint, transition, receiptOf, reconcile } from './domain.mjs';
const editor = Object.freeze({ id: 'student-01', tenantId: 'classroom-A', canClose: true });
const args = Object.freeze({ id: 'TK-1042', expectedVersion: 1, operationId: 'close-1042-01' });
test('a confirmed command binds actor, tenant, target, version and operation', () => {
  const command = commandOf(args, editor);
  for (const key of ['id', 'actorId', 'tenantId', 'expectedVersion', 'operationId', 'status']) {
    assert.notEqual(fingerprint(command), fingerprint({ ...command, [key]: 'different' }));
  }
  assert.throws(() => commandOf({ ...args, actorId: 'administrator' }, editor));
});
test('read-only identity cannot close and does not create a receipt', () => {
  const state = initialState(); const before = structuredClone(state);
  assert.equal(transition(state, commandOf(args, editor), { ...editor, canClose: false }).code, 'PERMISSION_DENIED');
  assert.deepEqual(state, before);
});
test('one operation commits once and the exact retry returns its receipt', () => {
  const state = initialState(); const command = commandOf(args, editor);
  assert.equal(transition(state, command, editor).state, 'committed');
  const again = transition(state, command, editor);
  assert.equal(again.deduplicated, true); assert.equal(state.writeCount, 1); assert.equal(state.ticket.version, 2);
  assert.equal(receiptOf(state, args.operationId, editor).state, 'committed');
});
test('same operation ID with another payload is refused, not silently reused', () => {
  const state = initialState(); const command = commandOf(args, editor);
  transition(state, command, editor);
  assert.equal(transition(state, { ...command, expectedVersion: 2 }, editor).code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(state.writeCount, 1);
});
test('another ticket version is not covered by the old command', () => {
  const state = initialState(); state.ticket.version = 2;
  assert.equal(transition(state, commandOf(args, editor), editor).code, 'VERSION_CONFLICT');
  assert.equal(state.writeCount, 0);
});
test('identity and tenant are checked at the business service', () => {
  for (const key of ['actorId', 'tenantId']) {
    const state = initialState(); const command = { ...commandOf(args, editor), [key]: 'other' };
    assert.equal(transition(state, command, editor).code, 'IDENTITY_MISMATCH'); assert.equal(state.writeCount, 0);
  }
});
test('an absent receipt cannot be relabeled as a definite failed write', () => {
  assert.equal(reconcile({ state: 'not-found' }, commandOf(args, editor)).state, 'unknown');
  assert.equal(reconcile({ state: 'committed', operationId: args.operationId, ticket: { id: args.id, status: 'closed', version: 2 } }, commandOf(args, editor)).state, 'committed');
});

test('a receipt claiming success for a different ticket must remain unknown', () => {
  assert.equal(reconcile({ state: 'committed', operationId: args.operationId, ticket: { id: 'TK-9999', status: 'closed', version: 2 } }, commandOf(args, editor)).state, 'unknown');
});
