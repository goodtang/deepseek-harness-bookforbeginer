// SPDX-License-Identifier: Apache-2.0
/** One tool consumer shared byte-for-byte by both data providers. */
import { randomUUID } from 'node:crypto';
import { defineTool } from '../tool-cases/support.mjs';
import { mark } from './audit.mjs';

export const name = 'book-ticket-consumer';
export const inject = ['tools', 'bookTickets'];
export function apply(ctx) {
  const owner = randomUUID();
  mark('consumer-loaded', { owner });
  ctx.tools.register(defineTool({
    name: 'book_ticket_lookup',
    description: 'Look up a fictional ticket by its exact ID; does not modify records.',
    parameters: { id: { type: 'string', required: true, description: 'Ticket ID, for example TK-1042' } },
    output: {
      schema: { oneOf: [
        { type: 'object', additionalProperties: false, properties: {
          id: { type: 'string', required: true }, status: { type: 'string', required: true }, title: { type: 'string', required: true },
        } },
        { type: 'null' },
      ] },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      return ctx.bookTickets.lookup(args.id, exec.signal);
    },
  }));
  ctx.on('session/event', (_session, event) => {
    if (event.type === 'turn/end') mark('consumer-turn-end', { owner, turn: event.data.turn });
  });
  ctx.effect(() => () => mark('consumer-unloaded', { owner }));
}
