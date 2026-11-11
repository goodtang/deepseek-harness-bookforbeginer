// SPDX-License-Identifier: Apache-2.0
/** Check a reader-selected module without changing its data. */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const path = process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : new URL('./inventory.mjs', import.meta.url).href;
const { lookupInventory } = await import(path);
assert.deepEqual(lookupInventory('SKU-1001'), { sku: 'SKU-1001', name: 'Notebook', stock: 0 });
assert.deepEqual(lookupInventory('SKU-1002'), { sku: 'SKU-1002', name: 'Pen', stock: 12 });
assert.equal(lookupInventory('SKU-missing'), null);
assert.equal(lookupInventory('constructor'), null);
const copy = lookupInventory('SKU-1001'); copy.stock = 99;
assert.equal(lookupInventory('SKU-1001').stock, 0);
console.log('Inventory assertions passed.');
