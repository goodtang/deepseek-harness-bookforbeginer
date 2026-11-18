// SPDX-License-Identifier: Apache-2.0
/** Validate file JSON before making a provider available; invalid data never falls back to memory. */
import { readFile } from 'node:fs/promises';

export function parseRecords(text) {
  const rows = JSON.parse(text);
  if (!Array.isArray(rows)) throw new Error('Ticket file must contain an array.');
  const ids = new Set();
  return rows.map(row => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)
      || Object.keys(row).sort().join(',') !== 'id,status,title'
      || !['id', 'status', 'title'].every(key => typeof row[key] === 'string')) {
      throw new Error('Each ticket requires exactly string id, status and title fields.');
    }
    if (ids.has(row.id)) throw new Error(`Duplicate ticket identity: ${row.id}`);
    ids.add(row.id);
    return Object.freeze({ ...row });
  });
}

export async function readTickets(path) {
  return parseRecords(await readFile(path, 'utf8'));
}
