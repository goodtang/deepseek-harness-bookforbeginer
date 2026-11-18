// SPDX-License-Identifier: Apache-2.0
/** Record preload execution without loading application modules or reading credentials. */
import { appendFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
const log = row => appendFileSync(process.env.BOOK_STARTUP_LOG,
  `${JSON.stringify({ time: Date.now(), ...row })}\n`);
log({ phase: 'node-preload', pid: process.pid });
// Process-owned diagnostics: unref keeps this timer from extending the application lifetime.
setInterval(() => log({ phase: 'startup-heartbeat', uptimeMs: Math.round(process.uptime() * 1000),
  resources: process.getActiveResourcesInfo() }), 2000).unref();

// Optional tracing changes import timing; it is diagnostic evidence, never a successful-run substitute.
if (process.env.BOOK_TRACE_IMPORTS === '1') {
  registerHooks({
    resolve(specifier, context, next) {
      if (specifier.startsWith('node:')) return next(specifier, context);
      log({ phase: 'resolve-start', specifier, parent: context.parentURL });
      const result = next(specifier, context);
      log({ phase: 'resolve-end', specifier, url: result.url });
      return result;
    },
    load(url, context, next) {
      if (url.startsWith('node:')) return next(url, context);
      log({ phase: 'load-start', url });
      const result = next(url, context);
      log({ phase: 'load-end', url, format: result.format });
      return result;
    },
  });
  log({ phase: 'trace-hooks-ready' });
}
