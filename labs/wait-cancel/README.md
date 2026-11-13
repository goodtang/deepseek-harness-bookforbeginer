# 第六章实验：可控制等待、取消与恢复

沿用真实 headless profile、book_ticket_lookup、TK-1042 和 lookupTicket。新增的 gate 是本书教学等待设施，在调用 lookupTicket 前等待控制端，不模拟一个真实数据库，也不修改上游。普通业务函数、schema 和 render 沿用前章。

## 运行与读者路径

使用第二章确认的 BookRoot/HarnessRoot。新终端恢复变量；每次更换输出目录，运行器与检查器均拒绝覆盖。完整复制和修改步骤见[第六章](../../chapters/第06章-查询还在等待，怎样正确取消.md)。

```powershell
$ReleaseEvidence = Join-Path $BookRoot 'labs/wait-cancel/.lab-runtime/release-01'
$CancelEvidence = Join-Path $BookRoot 'labs/wait-cancel/.lab-runtime/cancel-01'
Set-Location -LiteralPath $HarnessRoot
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot gate-release $ReleaseEvidence
$LASTEXITCODE
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot gate-cancel $CancelEvidence
$LASTEXITCODE
Set-Location -LiteralPath $BookRoot
node labs/wait-cancel/inspect.mjs $ReleaseEvidence
node labs/wait-cancel/inspect.mjs $CancelEvidence
```

gate-release 在 GET /state 确认 waiting=true 后 POST /release；gate-cancel 在同一状态下调用现有观察插件的 POST /cancel，由它调用公开 Agent.cancel。控制服务是实际进程中的本地接口，wait 是工具管线真实等待的 Promise。没有用固定 sleep 判断进入位置。

随后把 start/plugin.mjs 复制到本目录 .lab-runtime 的工作文件中，只将 gate.wait(exec.signal, true) 改为 false，保留 await 后的 throwIfAborted 与 finally，用 gate-uncooperative 场景并显式传入工作文件。运行器实际读取 accepted 后 waiting=true/aborted=true 的状态，并核对当时尚无业务查询或 finally，再明确放行；放行后被信号检查阻止查询。将 false 恢复 true，另开目录跑 gate-cancel。正确导入是 ../../tool-cases/support.mjs、../../first-tool/tickets.mjs 与 ../gate.mjs；保持起点与工作目录的层级。

查询结果提交后取消的对照使用 S3：

```powershell
$AfterEvidence = Join-Path $BookRoot 'labs/wait-cancel/.lab-runtime/after-result-01'
Set-Location -LiteralPath $HarnessRoot
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot S3 $AfterEvidence
$LASTEXITCODE
Set-Location -LiteralPath $BookRoot
node labs/wait-cancel/inspect.mjs $AfterEvidence
```

这里模型响应按脚本进入 stalled，再触发取消；正确工具结果已持久化，不重写为查询未发生。完成三种 gate 场景、恢复以及 S3 后，可核对自己的五组证据：

```powershell
node labs/wait-cancel/verify.mjs $ReleaseEvidence $CancelEvidence $IgnoreEvidence $RestoredEvidence $AfterEvidence
$LASTEXITCODE
```

IgnoreEvidence、RestoredEvidence 在正文工作步骤中建立。verify 比较插件确实修改且恢复，并运行六项错误证据副本检查。正常核对退出 0；应用取消退出 1 是本场景预期，驱动器符合断言仍退出 0。watchdogExpired=true 绝不当作用户取消通过。

## 作者证据与测量

本轮 Windows x64、Node v24.12.0，目标源码固定 fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159。五组作者运行、恢复、六项检查器反例见[verification.json](evidence/2026-11-13/verification.json)；原 S1/S2/S2-exhaust 回归见[regression.json](evidence/2026-11-13/regression.json)。公开摘录只包含教学字段、阶段和计数，不发布完整请求提示。完整本机原件在 .lab-runtime/current-*，输入字节哈希留在摘录中；读者的新时间/ID通常不同。

执行测量区分 ready、execute、gate-waiting、gate-settled、business-lookup、execute-finally、gate-server-closed。它们是本书实验记录；真实产品事件来自持久 JSONL，并同独立观察的 session/event 逐项比较。cancelAtSeq 是发出取消时 Session 的下一个序号，因此可等于随后产生的 tool/result.seq；不是说同序号的结果已经在取消前写入。

S3 沿用原工具，未加入新的 business-lookup 标记，摘录中的业务调用计数为 null；已完成查询的依据是正确 tool/result 在控制触发前存在，不把 null 计数误读为零。所有 gate 场景额外检查等待服务关闭回调、工具 finally、子进程和模型服务退出及临时目录清理。这里只验任务结束后的释放，未完成任意热卸载或并发验证。

当前证据说明源码与运行范围见[证据目录](evidence/2026-11-13/README.md)。旧版本按原哈希保留；本轮扩展共享 m1/run.mjs，前章报告的脚本哈希不自动升级。原偶发启动超时根因仍待定位；外网隔离、读者、新机/其他平台、真实服务和远端写入撤销均未验。
