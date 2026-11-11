// SPDX-License-Identifier: Apache-2.0
/** Source-loader preparation shared by the chapter-four plugin snapshots. */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { appendFileSync } from 'node:fs';
if (!process.env.BOOK_DSH_SOURCE) throw new Error('Run this example through labs/tool-cases/run.mjs.');
const tools = await import(pathToFileURL(resolve(process.env.BOOK_DSH_SOURCE, 'packages/core/tools/src/index.ts')).href);
const auditPath = process.env.BOOK_EXECUTION_LOG;
if (!auditPath) throw new Error('The teaching runner must provide an execution log.');
appendFileSync(auditPath, `${JSON.stringify({ type: 'ready' })}\n`);
/** Record entry into the actual execute callback; input validation remains in the Harness pipeline. */
export const defineTool = definition => tools.defineTool({
  ...definition,
  execute(...args) {
    appendFileSync(auditPath, `${JSON.stringify({ type: 'execute', tool: definition.name, input: args[0] })}\n`);
    return Reflect.apply(definition.execute, this, args);
  },
});
