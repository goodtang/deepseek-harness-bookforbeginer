// SPDX-License-Identifier: Apache-2.0
/** Local experiment control: observe Session events and invoke the public Agent cancellation API. */
import { createServer } from 'node:http';
import { appendFileSync, writeFileSync } from 'node:fs';
export const name = 'book-m1-observer';
export const inject = ['agents'];
export function apply(ctx) {
  const eventPath = process.env.BOOK_SESSION_EVENTS;
  const controlPath = process.env.BOOK_CONTROL_FILE;
  ctx.on('session/event', (session, event) => {
    appendFileSync(eventPath, `${JSON.stringify({ sessionId: session.id, event })}\n`);
  });
  const server = createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/cancel') { response.writeHead(404).end(); return; }
    const agents = ctx.agents.list();
    if (agents.length !== 1) { response.writeHead(409).end(); return; }
    const agent = agents[0];
    appendFileSync(eventPath, `${JSON.stringify({ control: 'user-cancel', sessionId: agent.id, atSeq: agent.session.seq })}\n`);
    agent.cancel({ kind: 'user' });
    response.writeHead(200, { 'content-type': 'application/json' }).end('{"accepted":true}');
  });
  ctx.effect(() => {
    server.listen(0, '127.0.0.1', () => {
      writeFileSync(controlPath, JSON.stringify({ port: server.address().port }));
    });
    return () => new Promise(resolve => server.close(resolve));
  });
}
