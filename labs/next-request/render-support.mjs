// SPDX-License-Identifier: Apache-2.0
/** Observe the input/output of render when the real tool pipeline invokes it. */
import { appendFileSync } from 'node:fs';
import { defineTool as defineMeasuredTool } from '../tool-cases/support.mjs';

export function defineTool(definition) {
  return defineMeasuredTool({ ...definition, output: { ...definition.output,
    render(args, value) {
      const content = definition.output.render(args, value);
      appendFileSync(process.env.BOOK_EXECUTION_LOG, `${JSON.stringify({ type: 'render', value, content })}\n`);
      return content;
    },
  } });
}
