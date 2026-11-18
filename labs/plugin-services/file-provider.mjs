// SPDX-License-Identifier: Apache-2.0
/** Read and validate one JSON snapshot at mount; no background watcher or persistent file handle. */
import { z } from './runtime.ts';
import { TicketSource } from './definition.ts';
import { readTickets } from './file-data.mjs';
import { mark, observeProvider } from './audit.mjs';

class FileTickets extends TicketSource {
  constructor(ctx, records) { super(ctx); this.records = records; }
  async lookup(id, signal) {
    signal.throwIfAborted();
    mark('provider-query', { source: 'file', id });
    const ticket = this.records.find(row => row.id === id);
    return ticket === undefined ? null : { ...ticket };
  }
}

export const name = 'book-ticket-file';
export const Config = z.object({ path: z.string().required() });
export async function apply(ctx, config) {
  const records = await readTickets(config.path);
  new FileTickets(ctx, records);
  observeProvider(ctx, 'file');
}
