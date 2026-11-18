// SPDX-License-Identifier: Apache-2.0
/** Exercise a mounted service directly; these diagnostic calls are separate from model tool execution. */
import assert from 'node:assert/strict';
import { mark } from './audit.mjs';

export const baseTicket = Object.freeze({ id: 'TK-1042', status: 'open', title: 'Invoice export failed' });
export const serviceCases = Object.freeze(['known-id', 'missing-id', 'independent-copy', 'already-cancelled']);

export async function checkService(service, expected = baseTicket) {
  mark('service-check-start');
  const signal = new AbortController().signal;
  const first = await service.lookup(expected.id, signal);
  assert.deepEqual(first, expected);
  mark('service-check-case', { name: 'known-id' });

  assert.equal(await service.lookup('TK-NOT-PRESENT', signal), null);
  mark('service-check-case', { name: 'missing-id' });

  first.status = 'only-this-returned-copy';
  const second = await service.lookup(expected.id, signal);
  assert.deepEqual(second, expected);
  assert.notStrictEqual(first, second);
  mark('service-check-case', { name: 'independent-copy' });

  const controller = new AbortController();
  const reason = new Error('Book service caller cancelled before lookup.');
  controller.abort(reason);
  await assert.rejects(() => service.lookup(expected.id, controller.signal), error => error === reason);
  mark('service-check-case', { name: 'already-cancelled' });
  mark('service-check-passed');
}

/** The composition itself injects only tools; use a short-lived consumer with the real service dependency. */
export async function checkMountedService(ctx, expected = baseTicket) {
  const probe = ctx.plugin({
    name: 'book-service-check',
    inject: ['bookTickets'],
    async apply(probeCtx) { await checkService(probeCtx.bookTickets, expected); },
  });
  try { await probe.await(); }
  finally { await probe.dispose(); }
}

/** Extract only calls outside the explicitly awaited startup checks. */
export function toolQueries(audit, expectedChecks) {
  const queries = []; let cases = null; let checks = 0;
  for (const row of audit) {
    if (row.type === 'service-check-start') { assert.equal(cases, null); cases = []; }
    else if (row.type === 'service-check-case') { assert.ok(cases); cases.push(row.name); }
    else if (row.type === 'service-check-passed') { assert.deepEqual(cases, serviceCases); cases = null; checks++; }
    else if (row.type === 'provider-query' && cases === null) queries.push({ source: row.source, id: row.id });
  }
  assert.equal(cases, null, 'Every service check must finish successfully');
  assert.equal(checks, expectedChecks, 'Missing mounted-service semantic checks');
  return queries;
}
