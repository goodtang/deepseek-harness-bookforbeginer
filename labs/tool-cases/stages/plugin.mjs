// SPDX-License-Identifier: Apache-2.0
/** Completed chapter-four registration, using the shared loader preparation. */
import { defineTool } from '../support.mjs';
import { lookupTicket } from '../../first-tool/tickets.mjs';

export const name = 'book-ticket-tool';
export const inject = ['tools'];

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'book_ticket_lookup',
    description: 'Look up a fictional ticket by its exact ID; does not modify records.',
    parameters: { id: { type: 'string', required: true, description: 'Ticket ID, for example TK-1042' } },
    output: {
      schema: { oneOf: [
        { type: 'object', additionalProperties: false, properties: {
          id: { type: 'string', required: true },
          status: { type: 'string', required: true },
          title: { type: 'string', required: true },
        } },
        { type: 'null' },
      ] },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      return lookupTicket(args.id);
    },
  }));
}
