// SPDX-License-Identifier: Apache-2.0
/** Source-loader preparation shared by the chapter-four plugin snapshots. */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
if (!process.env.BOOK_DSH_SOURCE) throw new Error('Run this example through labs/tool-cases/run.mjs.');
const tools = await import(pathToFileURL(resolve(process.env.BOOK_DSH_SOURCE, 'packages/core/tools/src/index.ts')).href);
export const defineTool = tools.defineTool;
