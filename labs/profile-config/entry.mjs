// SPDX-License-Identifier: Apache-2.0
/** Select a business provider through validated Loader config; the consumer stays unchanged. */
import { z } from '../plugin-services/runtime.ts';
import * as Memory from '../plugin-services/memory-provider.mjs';
import * as File from '../plugin-services/file-provider.mjs';
import { mount } from '../plugin-services/composition.mjs';
import { mark } from '../plugin-services/audit.mjs';

export const name = 'book-configured-tickets';
export const inject = ['tools'];
export const Config = z.object({ source: z.union(['memory', 'file']).default('memory'), path: z.string() });
export async function apply(ctx, config) {
  mark('config-selected', { source: config.source, ...(config.path === undefined ? {} : { path: config.path }) });
  if (config.source === 'file' && config.path === undefined) throw new Error('File tickets require config.path.');
  await mount(ctx, config.source === 'file' ? File : Memory,
    config.source === 'file' ? { path: config.path } : undefined);
}
