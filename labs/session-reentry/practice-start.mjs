// SPDX-License-Identifier: Apache-2.0
/** Copy to an ignored working file and implement the two launches and identity-file round trip. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

export async function practice({ launch, identityFile, firstTask, followup }) {
  // TODO: first launch in JSON mode, parse the opening session event, and write its id.
  // TODO: read the saved id, then submit followup to that same session in a second process.
  throw new Error('Complete the two-launch exercise before running acceptance.');
}
