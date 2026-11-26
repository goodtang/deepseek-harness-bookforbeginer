// SPDX-License-Identifier: Apache-2.0
/** Cross-check durable approval/tool results and independent business receipts, not final prose. */
import assert from 'node:assert/strict';
import { fingerprint, commandOf, reconcile } from './domain.mjs';
export function inspect(report) {
  const scenario=report.scenario;
  assert.deepEqual(report.cleanup,{businessClosed:true,rootRemoved:true});
  assert.deepEqual(report.physicalBusiness,{ticket:report.finalBusiness.ticket,writeCount:report.finalBusiness.writeCount,operations:report.finalBusiness.operations});
  const cancelled=['cancel-before','cancel-after'].includes(scenario);
  const denied=['read-only','reject','unavailable','never','wrong-call'].includes(scenario);
  const committed=['allow','duplicate','lost-after','cancel-after'].includes(scenario);
  assert.equal(report.sourceCommit,'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  assert.equal(report.phases.length,['duplicate','lost-after'].includes(scenario)?2:1);
  for(const phase of report.phases){
    assert.equal(phase.observedMatchesPersisted,true);
    assert.equal(phase.watchdogExpired,false);assert.equal(phase.exitCode,cancelled?1:0);
    assert.deepEqual(phase.cleanup,{childExited:true,modelClosed:true});
    phase.events.forEach((event,index)=>assert.equal(event.seq,index));
    const calls=phase.events.filter(e=>e.type==='tool/call');const results=phase.events.filter(e=>e.type==='tool/result');
    assert.equal(calls.length,1);assert.equal(results.length,1);assert.equal(calls[0].data.name,'book_ticket_close');
    assert.deepEqual(JSON.parse(calls[0].data.arguments),{id:'TK-1042',expectedVersion:1,operationId:'close-1042-01'});
    const expectedCommand=commandOf(JSON.parse(calls[0].data.arguments),{id:'student-01',tenantId:'classroom-A'});
    const message=results[0].data.message;assert.equal(message.toolCallId,calls[0].data.callId);assert.equal(message.isError,denied||cancelled);
    const terminal=phase.events.filter(e=>e.type==='turn/end');assert.equal(terminal.length,1);assert.equal(terminal[0].data.reason.kind,cancelled?'aborted':'completed');
    if(cancelled){assert.equal(terminal[0].data.reason.reason.kind,'user');assert.equal(phase.cancel.accepted,true);}
    assert.equal(phase.requests.length,cancelled?1:2);
    const executeCount=phase.audit.filter(e=>e.type==='execute').length;assert.equal(executeCount,denied||scenario==='cancel-before'?0:1);
    const asked=phase.events.filter(e=>e.type==='approval/asked');const decided=phase.events.filter(e=>e.type==='approval/decided');
    assert.equal(asked.length,scenario==='read-only'?0:1);assert.equal(decided.length,asked.length);
    if(asked.length){
      assert.equal(asked[0].data.callId,calls[0].data.callId);assert.equal(decided[0].data.id,asked[0].data.id);
      const planned=phase.audit.find(e=>e.type==='write-planned');assert.ok(planned);assert.deepEqual(planned.command,expectedCommand);assert.equal(planned.digest,fingerprint(planned.command));
      assert.ok(asked[0].data.reason.endsWith(`digest=${planned.digest}`));
      const outcome=scenario==='unavailable'?'unavailable':scenario==='cancel-before'?'cancelled':['reject','never','wrong-call'].includes(scenario)?'rejected':'allowed-once';
      assert.equal(decided[0].data.outcome,outcome);
    }
    assert.equal(phase.business.writeCount,committed?1:0);
    assert.equal(phase.receiptHTTPStatus,committed?200:404);
    assert.deepEqual(phase.reconciled,reconcile(phase.receipt,expectedCommand));
    assert.equal(phase.reconciled.state,committed?'committed':'unknown');
    assert.equal(Object.keys(phase.business.operations).length,committed?1:0);
    if(committed){const stored=Object.values(phase.business.operations)[0];assert.equal(stored.digest,fingerprint(expectedCommand));assert.deepEqual(stored.receipt.ticket,phase.business.ticket);}
    if(scenario==='wrong-call')assert.equal(phase.wrongCallRejected,true);
    if(!denied&&!cancelled){
      const value=JSON.parse(message.content.filter(x=>x.type==='text').map(x=>x.text).join(''));
      const expected=['lost-before'].includes(scenario)||(scenario==='lost-after'&&phase.index===0)?'unknown':['stale','server-denied'].includes(scenario)?'not-written':'committed';
      assert.equal(value.state,expected);assert.equal(value.operationId,expectedCommand.operationId);
      if(value.state==='committed')assert.deepEqual(value.ticket,phase.business.ticket);
      const blocks=phase.requests[1].body.messages.flatMap(m=>Array.isArray(m.content)?m.content:[]);const wire=blocks.find(b=>b.type==='tool_result');
      assert.equal(wire.tool_use_id,calls[0].data.callId);assert.deepEqual(JSON.parse(wire.content.filter(b=>b.type==='text').map(b=>b.text).join('')),value);
      if(scenario==='stale')assert.equal(value.code,'VERSION_CONFLICT');if(scenario==='server-denied')assert.equal(value.code,'PERMISSION_DENIED');
      if(phase.index===1)assert.equal(value.deduplicated,true);
    }
    assert.equal(phase.audit.filter(e=>e.type==='write-plugin-closed').length,1);
    if(scenario==='cancel-after'){assert.equal(phase.committedBeforeCancel.writeCount,1);assert.equal(phase.reconciled.state,'committed');}
    if(scenario==='lost-before')assert.equal(phase.reconciled.state,'unknown');
  }
  assert.equal(report.finalBusiness.writeCount,committed?1:0);assert.equal(report.finalBusiness.ticket.status,committed?'closed':'open');
  if(report.phases.length===2)assert.notEqual(report.phases[0].sessionId,report.phases[1].sessionId);
  return {scenario,writeCount:report.finalBusiness.writeCount,status:report.finalBusiness.ticket.status};
}
