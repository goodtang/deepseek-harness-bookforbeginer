// SPDX-License-Identifier: Apache-2.0
/** Fictional single-ticket business rules; no Harness API or transport dependency. */
import { createHash } from 'node:crypto';
export function initialState() {
  return { ticket: { id: 'TK-1042', status: 'open', title: 'Invoice export failed', version: 1 }, writeCount: 0, operations: {} };
}
function fields(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join() !== [...keys].sort().join()) throw new TypeError('Unexpected command fields');
}
export function commandOf(args, principal) {
  fields(args, ['id', 'expectedVersion', 'operationId']);
  if (typeof args.id !== 'string' || !/^TK-\d+$/.test(args.id) || !Number.isSafeInteger(args.expectedVersion) || args.expectedVersion < 1 || typeof args.operationId !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(args.operationId)) throw new TypeError('Invalid ticket command');
  return Object.freeze({ actorId: principal.id, tenantId: principal.tenantId, id: args.id, status: 'closed', expectedVersion: args.expectedVersion, operationId: args.operationId });
}
export function validateCommand(raw) {
  fields(raw, ['actorId', 'tenantId', 'id', 'status', 'expectedVersion', 'operationId']);
  if (typeof raw.actorId !== 'string' || typeof raw.tenantId !== 'string' || raw.status !== 'closed') throw new TypeError('Invalid command identity or action');
  return commandOf({ id: raw.id, expectedVersion: raw.expectedVersion, operationId: raw.operationId }, { id: raw.actorId, tenantId: raw.tenantId });
}
export function fingerprint(command) {
  return createHash('sha256').update(JSON.stringify([command.actorId, command.tenantId, command.id, command.status, command.expectedVersion, command.operationId])).digest('hex');
}
const keyOf = (tenantId, operationId) => JSON.stringify([tenantId, operationId]);
export function transition(state, command, principal) {
  const refuse = code => ({ state: 'not-written', code, operationId: command.operationId });
  if (command.actorId !== principal.id || command.tenantId !== principal.tenantId) return refuse('IDENTITY_MISMATCH');
  if (!principal.canClose) return refuse('PERMISSION_DENIED');
  const key = keyOf(principal.tenantId, command.operationId); const digest = fingerprint(command);
  const prior = state.operations[key];
  if (prior) return prior.digest === digest ? { ...structuredClone(prior.receipt), deduplicated: true } : refuse('IDEMPOTENCY_CONFLICT');
  if (command.id !== state.ticket.id) return refuse('NOT_FOUND');
  if (command.expectedVersion !== state.ticket.version || state.ticket.status !== 'open') return refuse('VERSION_CONFLICT');
  state.ticket = { ...state.ticket, status: 'closed', version: state.ticket.version + 1 };
  state.writeCount++;
  const receipt = { state: 'committed', operationId: command.operationId, ticket: { ...state.ticket }, deduplicated: false };
  state.operations[key] = { digest, actorId: principal.id, receipt };
  return structuredClone(receipt);
}
export function receiptOf(state, operationId, principal) {
  const item = state.operations[keyOf(principal.tenantId, operationId)];
  return item?.actorId === principal.id ? structuredClone(item.receipt) : { state: 'not-found', operationId };
}
export function reconcile(receipt, command) {
  const valid = command && receipt?.state === 'committed' && receipt.operationId === command.operationId
    && receipt.ticket?.id === command.id && receipt.ticket?.status === command.status
    && receipt.ticket?.version === command.expectedVersion + 1;
  return valid ? { state: 'committed', operationId: command.operationId } : { state: 'unknown', operationId: command?.operationId };
}
