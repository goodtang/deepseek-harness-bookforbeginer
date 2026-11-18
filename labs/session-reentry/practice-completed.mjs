// SPDX-License-Identifier: Apache-2.0
/** Completed reader exercise: persist an identity obtained from the real headless JSON stream. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

export async function practice({ launch, identityFile, firstTask, followup }) {
  const first = await launch(firstTask, { json: true });
  const rows = first.stdout.trim().split('\n').map(line => JSON.parse(line));
  const opening = rows.find(row => row.type === 'session');
  assert.equal(typeof opening?.sessionId, 'string');
  await writeFile(identityFile, JSON.stringify({ sessionId: opening.sessionId }) + '\n');

  const saved = JSON.parse(await readFile(identityFile, 'utf8'));
  assert.equal(typeof saved.sessionId, 'string');
  await launch(followup, { json: true, sessionId: saved.sessionId });
}
