// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from 'node:url';
import * as Provider from './file-provider.mjs';
import { mount } from './composition.mjs';
export const name = 'book-file-composition';
export const inject = ['tools'];
export async function apply(ctx) {
  await mount(ctx, Provider, { path: fileURLToPath(new URL('./tickets.json', import.meta.url)) });
}
