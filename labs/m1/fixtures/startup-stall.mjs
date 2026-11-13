// SPDX-License-Identifier: Apache-2.0
/** Deliberately hold module loading, to check startup-timeout diagnostics. */
import { appendFileSync } from 'node:fs';
appendFileSync(process.env.BOOK_EXECUTION_LOG, `${JSON.stringify({ type: 'diagnostic-module-entered' })}\n`);
setInterval(() => {}, 1000);
await new Promise(() => {});
export const name = 'book-startup-stall';
export function apply() {}
