// SPDX-License-Identifier: Apache-2.0
/** Local, explicitly released wait used by the book's real tool pipeline experiment. */
import { createServer } from 'node:http';
import { appendFileSync, writeFileSync, renameSync } from 'node:fs';

const audit = row => appendFileSync(process.env.BOOK_EXECUTION_LOG, `${JSON.stringify(row)}\n`);
const aborted = () => Object.assign(new Error('Book wait cancelled'), { name: 'AbortError' });

export function createGate() {
  let pending;
  const server = createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.method === 'GET' && request.url === '/state') {
      response.end(JSON.stringify({ waiting: !!pending, aborted: pending?.signal.aborted ?? false,
        cooperate: pending?.cooperate ?? null }));
    } else if (request.method === 'POST' && request.url === '/release' && pending) {
      pending.settle('released');
      response.end('{"released":true}');
    } else response.writeHead(409).end('{"accepted":false}');
  });
  return {
    listen() {
      server.listen(0, '127.0.0.1', () => {
        const path = process.env.BOOK_GATE_CONTROL;
        writeFileSync(`${path}.tmp`, JSON.stringify({ port: server.address().port }));
        renameSync(`${path}.tmp`, path);
      });
    },
    wait(signal, cooperate) {
      signal.throwIfAborted();
      if (pending) throw new Error('This fixture supports one pending query');
      return new Promise((resolve, reject) => {
        const onAbort = () => slot.settle('aborted');
        const slot = { signal, cooperate, settle(outcome) {
          if (pending !== slot) return;
          pending = undefined;
          signal.removeEventListener('abort', onAbort);
          audit({ type: 'gate-settled', outcome });
          if (outcome === 'released') resolve();
          else reject(aborted());
        } };
        pending = slot;
        if (cooperate) signal.addEventListener('abort', onAbort, { once: true });
        audit({ type: 'gate-waiting', cooperate });
      });
    },
    close() {
      pending?.settle('disposed');
      return new Promise((resolve, reject) => server.close(error => {
        if (error) { reject(error); return; }
        audit({ type: 'gate-server-closed' });
        resolve();
      }));
    },
  };
}
