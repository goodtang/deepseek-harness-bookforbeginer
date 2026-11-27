// SPDX-License-Identifier: Apache-2.0
/** Actual headless/model/approval/business experiment, with bounded owned-resource cleanup. */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, readdir, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { startBusiness } from './business.mjs';
import { reconcile, commandOf } from './domain.mjs';
import { inspect } from './verify.mjs';
const [sourceArg, scenario, outputArg, ruleModuleArg] = process.argv.slice(2);
const cases = ['allow','read-only','reject','unavailable','never','server-denied','stale','wrong-call','duplicate','lost-after','lost-before','cancel-before','cancel-after','empty-title'];
assert.ok(cases.includes(scenario)); const source = resolve(sourceArg); const output = resolve(outputArg);
assert.ok(scenario !== 'empty-title' || ruleModuleArg, 'empty-title requires your domain module as the last argument');
assert.equal(execFileSync('git', ['rev-parse','HEAD'], { cwd: source, encoding: 'utf8' }).trim(), 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
assert.equal(execFileSync('git', ['status','--porcelain','--untracked-files=no'], { cwd: source, encoding: 'utf8' }).trim(), '');
await mkdir(dirname(output), { recursive: true }); await mkdir(output);
const root = await mkdtemp(join(tmpdir(), 'book-write-')); const here = dirname(fileURLToPath(import.meta.url));
const loader = pathToFileURL(createRequire(join(source, 'package.json')).resolve('tsx/esm')).href;
const { startMockLlmServer } = await import(pathToFileURL(join(source, 'packages/test-support/llm-mock-server/src/index.ts')).href);
const sha = b => createHash('sha256').update(b).digest('hex');
const report = { scenario, sourceCommit: 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159', capturedAt: new Date().toISOString(), node: process.version, phases: [], cleanup: {}, accepted: false, networkIsolationVerified: false };
report.files={};for(const name of ['run.mjs','driver.mjs','plugin.mjs','business.mjs','domain.mjs','verify.mjs'])report.files[name]=sha(await readFile(join(here,name)));
let business; let failure;
try {
  let selectedTransition;
  if (ruleModuleArg) {
    const modulePath = resolve(ruleModuleArg); const bytes = await readFile(modulePath);
    selectedTransition = (await import(pathToFileURL(modulePath).href)).transition;
    assert.equal(typeof selectedTransition, 'function', 'Your domain module must export transition');
    report.ruleModule = { path: modulePath, sha256: sha(bytes) };
    await writeFile(join(output, 'reader-domain.mjs'), bytes);
  }
  business = await startBusiness({ file: join(root,'business.json'), principal: { id:'student-01', tenantId:'classroom-A', canClose: !['read-only','server-denied'].includes(scenario) },
    transition: selectedTransition, ticketTitle: scenario === 'empty-title' ? '   ' : undefined,
    fault: scenario === 'lost-after' ? 'drop-after' : scenario === 'lost-before' ? 'drop-before' : scenario === 'cancel-after' ? 'hold-after' : 'none' });
  const phaseCount = ['duplicate','lost-after'].includes(scenario) ? 2 : 1;
  for (let index = 0; index < phaseCount; index++) {
    const phaseRoot = join(root, `phase-${index}`); const saved = join(output, `phase-${index}`);
    await mkdir(phaseRoot); await mkdir(saved); const home = join(phaseRoot,'home'); const workspace = join(phaseRoot,'workspace');
    await mkdir(home); await mkdir(workspace);
    const audit = join(phaseRoot,'audit.jsonl'); const events = join(phaseRoot,'events.jsonl'); const controlFile = join(phaseRoot,'control.json');
    const sessions = join(phaseRoot,'sessions'); const patch = join(phaseRoot,'patch.yml');
    const overlay = ['- id: session-title-llm','  disabled: true','- id: session-persistence-jsonl','  config:',`    root: ${JSON.stringify(sessions.replaceAll('\\','/'))}`,'    compression: none','- insert:','    - id: book-close',`      name: ${JSON.stringify(join(here,'plugin.mjs').replaceAll('\\','/'))}`,'    - id: book-observer',`      name: ${JSON.stringify(join(here,'../m1/observer.mjs').replaceAll('\\','/'))}`,''].join('\n');
    await writeFile(patch, overlay); await writeFile(join(saved,'overlay.yml'), overlay);
    const model = await startMockLlmServer({ host:'127.0.0.1',port:0,apiKey:'book-mock-key',randomSeed:1042,
      sequence: ['tool_call_success','success'], repeatLast:false,toolName:'book_ticket_close',toolArguments:'{"id":"TK-1042","expectedVersion":1,"operationId":"close-1042-01"}',successText:'Write exercise finished.' });
    const phase = { index, cleanup: {} }; report.phases.push(phase);
    let child; let timer; let watchdog = false;
    try {
      const args = ['--import', pathToFileURL(join(here,'../m1/startup-probe.mjs')).href,'--import',loader,join(source,'apps/cli/src/bin.ts'),'--profile','headless','--patch',patch,'--approval-policy',scenario==='never'?'never':'ask','Close TK-1042 using book_ticket_close.'];
      await writeFile(join(saved,'launch.json'),JSON.stringify({ file:process.execPath,args,cwd:workspace,home })+'\n');
      child = spawn(process.execPath,args,{ cwd:workspace,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{ ...process.env,DSH_HOME:home,TSX_TSCONFIG_PATH:join(source,'tsconfig.json'),BOOK_DSH_SOURCE:source,
        BOOK_EXECUTION_LOG:audit,BOOK_SESSION_EVENTS:events,BOOK_CONTROL_FILE:join(phaseRoot,'cancel.json'),BOOK_STARTUP_LOG:join(phaseRoot,'startup.jsonl'),BOOK_WRITE_CONTROL:controlFile,
        BOOK_WRITE_CONFIG:JSON.stringify({ principal:{id:'student-01',tenantId:'classroom-A',canClose:scenario!=='read-only'},baseURL:business.baseURL,token:business.token,answerer:scenario==='unavailable'?'absent':'fixture' }),
        DEEPSEEK_API_KEY:'book-mock-key',DEEPSEEK_BASE_URL:`${model.baseURL}/v1` } });
      const closed = once(child,'close'); let stdout='';let stderr='';child.stdout.on('data',b=>{stdout+=b;});child.stderr.on('data',b=>{stderr+=b;});
      timer = setTimeout(()=>{watchdog=true;child.kill();},45000);
      let decided=false; let cancelled=false;
      while(child.exitCode===null && child.signalCode===null && !['read-only','unavailable','never'].includes(scenario)) {
        let control;
        try { control=JSON.parse(await readFile(controlFile,'utf8')); } catch(error) { if(error.code!=='ENOENT')throw error; }
        if(control) {
          const url=`http://127.0.0.1:${control.port}`;const headers={authorization:`Bearer ${control.key}`,'content-type':'application/json'};
          const state=await (await fetch(`${url}/state`,{headers})).json();
          if(state.pending && !decided) {
            phase.question=state.pending;
            if(scenario==='stale')business.bumpVersion();
            if(scenario==='wrong-call') {
              const wrong=await fetch(`${url}/decision`,{method:'POST',headers,body:JSON.stringify({callId:'not-this-call',outcome:'allowed-once'})});assert.equal(wrong.status,409);phase.wrongCallRejected=true;
            }
            if(scenario==='cancel-before') {
              phase.cancel=await (await fetch(`${url}/cancel`,{method:'POST',headers})).json();cancelled=true;
            } else {
              const outcome=['reject','wrong-call'].includes(scenario)?'rejected':'allowed-once';
              const answer=await fetch(`${url}/decision`,{method:'POST',headers,body:JSON.stringify({callId:state.pending.callId,outcome})});assert.equal(answer.status,200);
            }
            decided=true;
          }
          if(scenario==='cancel-after' && business.snapshot().held && !cancelled) {
            phase.committedBeforeCancel=business.snapshot();phase.cancel=await (await fetch(`${url}/cancel`,{method:'POST',headers})).json();cancelled=true;
          }
        }
        if(decided && (scenario!=='cancel-after'||cancelled))break;
        await delay(20);
      }
      const [code]=await closed;clearTimeout(timer);phase.exitCode=code;phase.watchdogExpired=watchdog;
      await writeFile(join(saved,'stdout.txt'),stdout);await writeFile(join(saved,'stderr.txt'),stderr);phase.stderr=stderr;
      assert.equal(watchdog,false,'Startup/execution watchdog is not a user cancellation');
      phase.audit=(await readFile(audit,'utf8')).trim().split('\n').map(JSON.parse);
      const observed=(await readFile(events,'utf8')).trim().split('\n').map(JSON.parse).filter(row=>row.event).map(row=>row.event);
      const files=[];const scan=async dir=>{for(const entry of await readdir(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isDirectory())await scan(p);else if(/^session.*\.jsonl$/.test(entry.name))files.push(p);}};
      await scan(sessions);assert.equal(files.length,1);const raw=await readFile(files[0]);await writeFile(join(saved,'session.jsonl'),raw);
      const rows=raw.toString('utf8').trim().split('\n').map(JSON.parse);phase.sessionId=rows[0].id;phase.events=rows.slice(1);assert.deepEqual(phase.events,observed);phase.observedMatchesPersisted=true;
      phase.requests=model.requests.map(r=>({behavior:r.behavior,body:r.body}));phase.business=business.snapshot();
      const receiptResponse=await fetch(`${business.baseURL}/operations/close-1042-01`,{headers:{authorization:`Bearer ${business.token}`}});
      phase.receipt=await receiptResponse.json();phase.receiptHTTPStatus=receiptResponse.status;
      phase.reconciled=receiptResponse.status===200?reconcile(phase.receipt,commandOf({id:'TK-1042',expectedVersion:1,operationId:'close-1042-01'},{id:'student-01',tenantId:'classroom-A'})):{state:'unknown',operationId:'close-1042-01'};
      await writeFile(join(saved,'audit.jsonl'),(await readFile(audit)));await writeFile(join(saved,'observed.jsonl'),await readFile(events));
    } finally {
      clearTimeout(timer);if(child && child.exitCode===null && child.signalCode===null){const done=once(child,'close');child.kill();await done;}
      phase.requests=model.requests.map(r=>({behavior:r.behavior,body:r.body}));
      phase.business=business.snapshot();phase.diagnostics={};
      for(const [name,path] of [['startup.jsonl',join(phaseRoot,'startup.jsonl')],['audit.jsonl',audit],['observed.jsonl',events],['control.json',controlFile]]){
        try{const bytes=await readFile(path);await writeFile(join(saved,name),bytes);phase.diagnostics[name]={exists:true,bytes:bytes.length};}
        catch(error){if(error.code!=='ENOENT')throw error;phase.diagnostics[name]={exists:false};}
      }
      await model.close();phase.cleanup={childExited:!child||child.exitCode!==null||child.signalCode!==null,modelClosed:true};
    }
  }
  report.finalBusiness=business.snapshot();
} catch(error) {failure=error;report.failure=String(error);}
finally {
  if(business){
    report.finalBusiness=business.snapshot();
    try{const raw=await readFile(join(root,'business.json'));await writeFile(join(output,'business.json'),raw);report.physicalBusiness=JSON.parse(raw);report.businessFileSha256=sha(raw);
      assert.deepEqual(report.physicalBusiness,{ticket:report.finalBusiness.ticket,writeCount:report.finalBusiness.writeCount,operations:report.finalBusiness.operations});
    }catch(error){failure=error;report.failure=String(error);}
    await business.close();report.cleanup.businessClosed=true;
  }
  assert.ok(root.startsWith(resolve(tmpdir())+sep)&&basename(root).startsWith('book-write-'));await rm(root,{recursive:true});
  try{await access(root);report.cleanup.rootRemoved=false;}catch(error){if(error.code!=='ENOENT')throw error;report.cleanup.rootRemoved=true;}
  if(!failure){try{inspect(report);report.accepted=true;}catch(error){failure=error;report.failure=String(error);}}
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({scenario,accepted:report.accepted,evidence:output,failure:report.failure}));if(failure||!report.accepted)process.exitCode=1;
