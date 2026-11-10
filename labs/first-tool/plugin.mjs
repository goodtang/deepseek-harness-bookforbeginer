// SPDX-License-Identifier: Apache-2.0
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { lookupTicket } from './tickets.mjs';

// Source imports keep this exercise tied to the recorded checkout, without installing a package.
const { defineTool } = await import(pathToFileURL(resolve(
  process.env.BOOK_DSH_SOURCE, 'packages/core/tools/src/index.ts',
)).href);

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
