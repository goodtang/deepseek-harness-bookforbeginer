// SPDX-License-Identifier: Apache-2.0
/** Decide only from the actual operation receipt and the expected command. */
export function inspectReceipt(receipt, expected) {
  // TODO: compare state, operationId, ticket id/status/version. Absence is unknown.
  throw new Error('Complete the receipt check before using this module.');
}
