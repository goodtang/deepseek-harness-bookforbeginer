// SPDX-License-Identifier: Apache-2.0
/** Runnable starting point: dependencies resolve, but no business tool is registered. */
import { defineTool } from '../support.mjs';
import { lookupTicket } from '../../first-tool/tickets.mjs';

export const name = 'book-ticket-tool';
export const inject = ['tools'];

export function apply(ctx) {
}
