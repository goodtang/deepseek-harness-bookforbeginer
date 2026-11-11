// SPDX-License-Identifier: Apache-2.0
/** Copy with inventory.mjs renamed to my-inventory.mjs in the same working directory. */
import { defineTool } from '../support.mjs';
import { lookupInventory } from './my-inventory.mjs';
export const name = 'book-inventory-tool';
export const inject = ['tools'];
export function apply(ctx) {
}
