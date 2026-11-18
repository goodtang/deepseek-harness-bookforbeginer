// SPDX-License-Identifier: Apache-2.0
/** Reuse the original ordinary query function behind the business service. */
import { TicketSource } from './definition.ts';
import { lookupTicket } from '../first-tool/tickets.mjs';
import { mark, observeProvider } from './audit.mjs';

class MemoryTickets extends TicketSource {
  async lookup(id, signal) {
    signal.throwIfAborted();
    mark('provider-query', { source: 'memory', id });
    return lookupTicket(id);
  }
}

export const name = 'book-ticket-memory';
export function apply(ctx) {
  new MemoryTickets(ctx);
  observeProvider(ctx, 'memory');
}
