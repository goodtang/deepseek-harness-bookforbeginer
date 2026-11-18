// SPDX-License-Identifier: Apache-2.0
import * as Provider from './memory-provider.mjs';
import { mount } from './composition.mjs';
export const name = 'book-memory-composition';
export const inject = ['tools'];
export async function apply(ctx) { await mount(ctx, Provider, {}); }
