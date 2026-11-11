// SPDX-License-Identifier: Apache-2.0
/** Author reference for the chapter-four inventory transfer exercise. */
import { defineTool } from './support.mjs';
import { lookupInventory } from './inventory.mjs';
export const name = 'book-inventory-tool';
export const inject = ['tools'];
export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'book_inventory_lookup',
    description: 'Look up fictional inventory; stock zero is an existing product.',
    parameters: { sku: { type: 'string', required: true, description: 'Product SKU' } },
    output: {
      schema: { oneOf: [
        { type: 'object', additionalProperties: false, properties: {
          sku: { type: 'string', required: true },
          name: { type: 'string', required: true },
          stock: { type: 'number', required: true },
        } },
        { type: 'null' },
      ] },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      return lookupInventory(args.sku);
    },
  }));
}
