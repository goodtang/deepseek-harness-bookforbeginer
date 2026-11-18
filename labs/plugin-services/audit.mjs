// SPDX-License-Identifier: Apache-2.0
/** Record local teaching measurements; no model-visible inputs are added here. */
import { appendFileSync } from 'node:fs';

export function mark(type, fields = {}) {
  appendFileSync(process.env.BOOK_EXECUTION_LOG, JSON.stringify({ type, ...fields }) + '\n');
}

export function observeProvider(ctx, source) {
  mark('provider-loaded', { source });
  ctx.effect(() => () => mark('provider-unloaded', { source }));
}
