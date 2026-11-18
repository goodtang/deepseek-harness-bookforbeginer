// SPDX-License-Identifier: Apache-2.0
/** Replace only at the idle startup checkpoint; never claim in-flight work is drained by this exercise. */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as Memory from './memory-provider.mjs';
import * as File from './file-provider.mjs';
import { mount, state } from './composition.mjs';

export const name = 'book-lifecycle-composition';
export const inject = ['tools'];
export async function apply(ctx) {
  const { consumer, provider } = await mount(ctx, Memory, {});
  await provider.dispose(); await consumer.await();
  assert.deepEqual(state(ctx, consumer, 'provider-removed'), { phase: 'provider-removed', state: 'PENDING', service: false, tool: false });
  const replacement = ctx.plugin(File, { path: fileURLToPath(new URL('./tickets.json', import.meta.url)) });
  await replacement.await(); await consumer.await();
  assert.deepEqual(state(ctx, consumer, 'replacement-ready'), { phase: 'replacement-ready', state: 'ACTIVE', service: true, tool: true });
}
