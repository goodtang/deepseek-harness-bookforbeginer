// SPDX-License-Identifier: Apache-2.0
/** Owned loopback business fixture: single-process synchronous snapshot+receipt commit, not a production database. */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { writeFileSync, renameSync } from 'node:fs';
import { initialState, validateCommand, transition, receiptOf } from './domain.mjs';
export async function startBusiness({ file, principal, fault = 'none' }) {
  let state = initialState(); let usedFault = false; let held = false; let attempts = 0;
  const token = randomUUID(); const sockets = new Set();
  const save = next => {
    const temporary = `${file}.${randomUUID()}.tmp`;
    writeFileSync(temporary, JSON.stringify(next) + '\n', { flag: 'wx' }); renameSync(temporary, file); state = next;
  };
  save(state);
  const send = (response, code, value) => response.writeHead(code, { 'content-type': 'application/json' }).end(JSON.stringify(value));
  const server = createServer(async (request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) { send(response, 401, { state: 'not-written', code: 'UNAUTHENTICATED' }); return; }
    if (request.method === 'GET' && request.url.startsWith('/operations/')) {
      const receipt = receiptOf(state, decodeURIComponent(request.url.slice('/operations/'.length)), principal);
      send(response, receipt.state === 'committed' ? 200 : 404, receipt); return;
    }
    if (request.method !== 'POST' || request.url !== '/close') { send(response, 404, { state: 'not-found' }); return; }
    try {
      let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 8192) throw new TypeError('Request too large'); }
      const command = validateCommand(JSON.parse(body)); attempts++;
      if (fault === 'drop-before' && !usedFault) { usedFault = true; request.socket.destroy(); return; }
      const next = structuredClone(state); const receipt = transition(next, command, principal);
      if (receipt.state === 'committed' && !receipt.deduplicated) save(next);
      if (receipt.state === 'committed' && !usedFault && ['drop-after', 'hold-after'].includes(fault)) {
        usedFault = true;
        if (fault === 'drop-after') request.socket.destroy();
        else { held = true; response.on('close', () => { held = false; }); }
        return;
      }
      send(response, receipt.state === 'committed' ? 200 : receipt.code === 'PERMISSION_DENIED' ? 403 : 409, receipt);
    } catch (error) {
      if (error instanceof TypeError || error instanceof SyntaxError) { send(response, 400, { state: 'not-written', code: 'INVALID_COMMAND' }); return; }
      // A storage failure does not establish whether a rename committed; do not claim no write.
      request.socket.destroy();
    }
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { baseURL: `http://127.0.0.1:${server.address().port}`, token,
    snapshot: () => ({ ...structuredClone(state), held, attempts }),
    bumpVersion() { save({ ...structuredClone(state), ticket: { ...state.ticket, version: state.ticket.version + 1 } }); },
    async close() { const done = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); for (const socket of sockets) socket.destroy(); await done; },
  };
}
