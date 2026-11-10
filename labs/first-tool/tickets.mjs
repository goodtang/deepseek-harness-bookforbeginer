// SPDX-License-Identifier: Apache-2.0
/** Fixed fictional records for the first read-only business operation. */
const tickets = Object.freeze({
  'TK-1042': Object.freeze({ id: 'TK-1042', status: 'open', title: 'Invoice export failed' }),
});

/** Return a copy so callers cannot change the exercise's records. */
export function lookupTicket(id) {
  const ticket = Object.hasOwn(tickets, id) ? tickets[id] : null;
  return ticket ? { ...ticket } : null;
}
