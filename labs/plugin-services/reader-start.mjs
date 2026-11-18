// SPDX-License-Identifier: Apache-2.0
/** Complete lookup in your own provider; loading, validation and ownership are supplied. */
import { TicketSource } from './definition.ts';
import { Config } from './file-provider.mjs';
import { readTickets } from './file-data.mjs';
import { mark, observeProvider } from './audit.mjs';
export { Config };

class ReaderTickets extends TicketSource {
  constructor(ctx, records) { super(ctx); this.records = records; }
  async lookup(id, signal) {
    mark('provider-query', { source: 'reader', id });
    // TODO: check cancellation; find the exact id; return a copy or null.
    throw new Error('Complete the reader provider lookup.');
  }
}

export const name = 'book-ticket-reader';
export async function apply(ctx, config) {
  const records = await readTickets(config.path);
  new ReaderTickets(ctx, records);
  observeProvider(ctx, 'reader');
}
