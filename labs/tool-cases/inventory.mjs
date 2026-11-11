// SPDX-License-Identifier: Apache-2.0
/** Fictional inventory reference: a zero stock record still exists. */
const inventory = Object.freeze({
  'SKU-1001': Object.freeze({ sku: 'SKU-1001', name: 'Notebook', stock: 0 }),
  'SKU-1002': Object.freeze({ sku: 'SKU-1002', name: 'Pen', stock: 12 }),
});
export function lookupInventory(sku) {
  const item = Object.hasOwn(inventory, sku) ? inventory[sku] : null;
  return item ? { ...item } : null;
}
