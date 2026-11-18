// SPDX-License-Identifier: Apache-2.0
/** Assert actual service/tool/fiber state; no timers decide lifecycle completion. */
import assert from 'node:assert/strict';
import { fiberStateNames } from './runtime.ts';
import * as Consumer from './consumer.mjs';
import { mark } from './audit.mjs';

export function state(ctx, consumer, phase) {
  const row = { phase, state: fiberStateNames[consumer.state], service: ctx.get('bookTickets') !== undefined,
    tool: ctx.tools.get('book_ticket_lookup') !== undefined };
  mark('composition-state', row);
  return row;
}

export async function mount(ctx, providerPlugin, config, consumerPlugin = Consumer) {
  const consumer = ctx.plugin(consumerPlugin);
  await consumer.await();
  assert.deepEqual(state(ctx, consumer, 'before-provider'), { phase: 'before-provider', state: 'PENDING', service: false, tool: false });
  const provider = ctx.plugin(providerPlugin, config);
  await provider.await(); await consumer.await();
  assert.deepEqual(state(ctx, consumer, 'provider-ready'), { phase: 'provider-ready', state: 'ACTIVE', service: true, tool: true });
  return { consumer, provider };
}
