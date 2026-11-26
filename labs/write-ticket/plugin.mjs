// SPDX-License-Identifier: Apache-2.0
/** Policy, answerer and business-tool composition for the fictional close operation. */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { defineTool } from '../tool-cases/support.mjs';
import { mark } from '../plugin-services/audit.mjs';
import { commandOf, fingerprint } from './domain.mjs';
export const inject = ['tools', 'agents', 'approval'];
export function apply(ctx) {
  const config = JSON.parse(process.env.BOOK_WRITE_CONFIG);
  const plans = new Map(); let pending; const key = randomUUID();
  ctx.on('session/event', (session, event) => {
    if (event.type === 'approval/decided') mark('approval-outcome', { outcome: event.data.outcome });
  });
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.name !== 'book_ticket_close') return next();
    if (!config.principal.canClose) { mark('permission-denied'); return { kind: 'deny', reason: 'This identity is read-only.' }; }
    const command = commandOf(exec.arguments, config.principal); const digest = fingerprint(command);
    plans.set(exec.callId, { command, digest }); mark('write-planned', { callId: exec.callId, command, digest });
    return { kind: 'ask', reason: `Close ${command.id} from version ${command.expectedVersion}; actor=${command.actorId}; tenant=${command.tenantId}; operation=${command.operationId}; digest=${digest}` };
  }, { prepend: true });
  ctx.on('tools/result', exec => { if (exec.name === 'book_ticket_close') plans.delete(exec.callId); });
  if (config.answerer !== 'absent') ctx.on('approval/request', async (req, next) => {
    if (req.toolName !== 'book_ticket_close') return next();
    const plan = plans.get(req.callId);
    if (pending || !plan || !req.reason?.endsWith(`digest=${plan.digest}`)) return 'unavailable';
    return new Promise(resolve => {
      const finish = outcome => { req.signal?.removeEventListener('abort', abort); pending = undefined; resolve(outcome); };
      const abort = () => finish('cancelled');
      pending = { callId: req.callId, reason: req.reason, command: plan.command, finish };
      req.signal?.addEventListener('abort', abort, { once: true });
      if (req.signal?.aborted) abort();
    });
  });
  ctx.tools.register(defineTool({ name: 'book_ticket_close', description: 'Close a fictional ticket after permission and exact-call confirmation. Reuse operationId for the same intended change.',
    parameters: { id: { type: 'string', required: true }, expectedVersion: { type: 'integer', required: true }, operationId: { type: 'string', required: true } },
    output: { schema: { type: 'object', additionalProperties: false, properties: {
      state: { type: 'string', required: true }, operationId: { type: 'string', required: true }, code: { type: 'string' }, deduplicated: { type: 'boolean' },
      ticket: { type: 'object', additionalProperties: false, properties: { id: { type: 'string', required: true }, status: { type: 'string', required: true }, title: { type: 'string', required: true }, version: { type: 'integer', required: true } } },
    } }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, exec) {
      exec.signal.throwIfAborted(); const command = commandOf(args, config.principal); const plan = plans.get(exec.callId);
      if (!plan || fingerprint(command) !== plan.digest) return { state: 'not-written', operationId: command.operationId, code: 'CONFIRMATION_MISMATCH' };
      mark('write-sent', { command });
      try {
        const response = await fetch(`${config.baseURL}/close`, { method: 'POST', signal: exec.signal,
          headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json' }, body: JSON.stringify(command) });
        const result = await response.json();
        if (result.operationId !== command.operationId || !['committed', 'not-written'].includes(result.state)) throw new TypeError('Unusable business reply');
        if (result.state === 'committed' && (response.status !== 200 || result.ticket?.id !== command.id || result.ticket?.status !== 'closed' || result.ticket?.version !== command.expectedVersion + 1)) throw new TypeError('Unmatched committed reply');
        if (result.state === 'not-written' && (typeof result.code !== 'string' || response.ok)) throw new TypeError('Unmatched refusal');
        mark('write-reply', { result }); return result;
      } catch (_transportOrUnusableReply) {
        const result = { state: 'unknown', operationId: command.operationId, code: 'CHECK_OPERATION_STATUS' };
        mark('write-unknown', { result }); return result;
      }
    },
  }));
  const server = createServer(async (request, response) => {
    if (request.headers.authorization !== `Bearer ${key}`) { response.writeHead(401).end(); return; }
    const reply = (code, body) => response.writeHead(code, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    if (request.url === '/state' && request.method === 'GET') { reply(200, { pending: pending ? { callId: pending.callId, reason: pending.reason, command: pending.command } : null }); return; }
    if (request.url === '/cancel' && request.method === 'POST') {
      const agents = ctx.agents.list(); if (agents.length !== 1) { reply(409, {}); return; }
      agents[0].cancel({ kind: 'user' }); reply(200, { accepted: true }); return;
    }
    if (request.url === '/decision' && request.method === 'POST') {
      try {
        let raw = ''; for await (const chunk of request) { raw += chunk; if (raw.length > 2048) throw new TypeError('Large decision'); }
        const body = JSON.parse(raw);
        if (!pending || body.callId !== pending.callId || !['allowed-once', 'rejected'].includes(body.outcome)) { reply(409, { accepted: false }); return; }
        mark('answerer-decision', { callId: body.callId, outcome: body.outcome }); pending.finish(body.outcome); reply(200, { accepted: true });
      } catch (_invalidControlInput) { reply(400, {}); }
      return;
    }
    reply(404, {});
  });
  ctx.effect(() => {
    server.listen(0, '127.0.0.1', () => writeFileSync(process.env.BOOK_WRITE_CONTROL, JSON.stringify({ port: server.address().port, key })));
    return async () => { pending?.finish('unavailable'); plans.clear(); const done = new Promise(resolve => server.close(resolve)); server.closeIdleConnections(); await done; mark('write-plugin-closed'); };
  });
}
