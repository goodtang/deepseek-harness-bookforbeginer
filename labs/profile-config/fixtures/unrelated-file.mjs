// SPDX-License-Identifier: Apache-2.0
/** Deliberate control: fail on an unrelated settings read before any ticket configuration. */
import { readFile } from 'node:fs/promises';
export const inject = ['tools'];
export async function apply() {
  await readFile(new URL('./unrelated-settings-that-do-not-exist.json', import.meta.url));
}
