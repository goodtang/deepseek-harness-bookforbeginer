// SPDX-License-Identifier: Apache-2.0
/** Record preload execution without loading application modules or reading credentials. */
import { appendFileSync } from 'node:fs';
appendFileSync(process.env.BOOK_STARTUP_LOG,
  `${JSON.stringify({ phase: 'node-preload', time: Date.now(), pid: process.pid })}\n`);
