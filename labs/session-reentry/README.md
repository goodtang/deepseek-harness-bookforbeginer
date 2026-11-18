# 第七章实验：另一个进程能接上原会话吗

这是书稿教学设施，使用目标工程的真实 `dsh --profile headless` 和 `--session-id`，并由真实工具注册表/执行管线调用既有 `book_ticket_lookup`。不自行实现恢复循环，不改上游源码，不把读 JSONL 当续接成功。源码锁定 `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`，作者实测 Windows、Node 24.12.0、已有依赖。

## 运行

下面是 PowerShell。在任意目录先定位两个仓库；名称、盘符及是否相邻均不作假设。依赖准备仍见[第二章环境说明](../run-basics/SETUP.md)，本节不代替新机安装验收。

```powershell
$BookRoot = (Resolve-Path -LiteralPath (Read-Host '书稿仓库的实际完整路径')).Path
$HarnessRoot = (Resolve-Path -LiteralPath (Read-Host '目标工程的实际完整路径')).Path
if (!(Test-Path -LiteralPath (Join-Path $BookRoot 'labs/session-reentry/run.mjs'))) { throw '书稿路径不对' }
if (!(Test-Path -LiteralPath (Join-Path $HarnessRoot 'apps/cli/src/bin.ts'))) { throw '源码路径不对' }
Set-Location -LiteralPath $HarnessRoot
$Evidence = Join-Path $BookRoot ('labs/session-reentry/.lab-runtime/resume-' + [guid]::NewGuid())
node --import tsx/esm (Join-Path $BookRoot 'labs/session-reentry/run.mjs') $HarnessRoot resume $Evidence
if ($LASTEXITCODE -ne 0) { throw "实验失败，保留原件：$Evidence" }
$Result = Get-Content -LiteralPath (Join-Path $Evidence 'report.json') -Raw | ConvertFrom-Json
$Result.verification
$Result.phases | Select-Object name,pid,exitCode,executionCount,watchdogExpired
$Result.cleanup
```

`resume` 实际依次启动四个子进程：新查询、同目录同 ID 续接、换目录拒绝、不存在的 ID 拒绝。首两次之间保留 home、workspace 和 Session 根；不是先删除再从证据副本重建。拒绝场景不应消耗模型脚本或进入工具。所有子进程关闭后关闭模拟服务，删除本次临时根并核查不存在。输出目录保留，不重复使用已有目录。

`fresh` 改为两次均不带 ID，形成新会话对照：

```powershell
$FreshEvidence = Join-Path $BookRoot ('labs/session-reentry/.lab-runtime/fresh-' + [guid]::NewGuid())
node --import tsx/esm (Join-Path $BookRoot 'labs/session-reentry/run.mjs') $HarnessRoot fresh $FreshEvidence
if ($LASTEXITCODE -ne 0) { throw "对照失败：$FreshEvidence" }
$FreshResult = Get-Content -LiteralPath (Join-Path $FreshEvidence 'report.json') -Raw | ConvertFrom-Json
$FreshResult.verification
```

两组首进程均执行一次查询、请求两次，次进程请求一次但不执行工具。`resume` 次请求含旧 tool_use/tool_result、同 ID、原字节前缀不变、累计两个 completed 回合；`fresh` 新 ID、次请求无旧工具块、旧文件仍原样、第二份日志只有本会话的一个回合。固定模拟答复相同，不能拿答复文字替代这些断言。

## 自己组织续接入口

先复制 `practice-start.mjs` 到自己的 `.lab-runtime` 子目录，填写 `practice({ launch, identityFile, firstTask, followup })`。完整讲解与逐步撤提示见[第七章](../../chapters/第07章-程序关掉以后，任务记录还在吗.md)7.3。

设施提供每次都启动真实 headless 的 `launch(task, { json, sessionId })`：`json: true` 添加 `--json`，提供 `sessionId` 才添加 `--session-id`。它不替读者提取、选择或保存 ID。`firstTask` 和 `followup` 是本次两次输入；`identityFile` 是设施拥有的临时根中的选择记录路径。home/工作目录/日志根在两次间保持相同，模拟服务、原件采集和清理由设施负责。

读者代码负责：第一次JSON模式启动 → 解析真实opening session事件中的sessionId → writeFile保存 → readFile读回 → 把读回ID交给第二次启动。完成版[practice-completed.mjs](practice-completed.mjs)供做完后对照；输出的sessionId与持久header.id字段不同，不猜文件名或硬编码ID。

```powershell
$PracticeDirectory = Join-Path $BookRoot ('labs/session-reentry/.lab-runtime/my-practice-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $PracticeDirectory | Out-Null
$PracticeFile = Join-Path $PracticeDirectory 'practice.mjs'
Copy-Item -LiteralPath (Join-Path $BookRoot 'labs/session-reentry/practice-start.mjs') -Destination $PracticeFile
# 编辑 PracticeFile，完成两个 TODO 后运行；起点会主动报错，不能当成完成版。
$PracticeEvidence = Join-Path $BookRoot ('labs/session-reentry/.lab-runtime/practice-' + [guid]::NewGuid())
node --import tsx/esm (Join-Path $BookRoot 'labs/session-reentry/run.mjs') $HarnessRoot practice $PracticeEvidence $PracticeFile
if ($LASTEXITCODE -ne 0) { throw "练习未通过：$PracticeEvidence" }
node (Join-Path $BookRoot 'labs/session-reentry/check-records.mjs') `
  (Join-Path $PracticeEvidence 'first-durable.jsonl') (Join-Path $PracticeEvidence 'second-durable.jsonl')
if ($LASTEXITCODE -ne 0) { throw '原始记录未满足断言' }
```

设施在两次读者启动后还执行原wrong-cwd/missing-id检查。成功要求读者保存的ID、实际输出ID、持久header.id及第二次指定ID一致，并通过原真实请求/前缀/回合/清理检查。第二次省略ID时两个进程可能均退出0，练习仍必须拒绝；错误ID则由真实工程拒绝。不要把这些边界都改成自动创建新会话。

`check-records.mjs` 自己读取两份JSONL，不读取report.json的通过结论。`projectTurns` 是只处理lastTurn/openTurnStartSeq的教学演算，不是新插件或框架替代实现。正文表格中的seq4/24/27/35来自原样本；按实际类型定位。下面检查真实文件与五种错误副本，未提供路径时测试会跳过，跳过不计通过：

```powershell
$env:BOOK_RECORDS_DIR = $PracticeEvidence
try {
  node --test (Join-Path $BookRoot 'labs/session-reentry/records.test.mjs')
  if ($LASTEXITCODE -ne 0) { throw '记录检查器反例未通过' }
} finally { Remove-Item Env:BOOK_RECORDS_DIR }
```

维护者的 `verify-practice.mjs <source> <正确目录> <省略ID目录> <错误ID目录> <恢复目录>` 要在目标源码目录以 `node --import tsx/esm` 启动，比较普通模式正确/真实错误/恢复及上游投影的两字段结果；不能把有导入追踪的成功充当普通模式通过。当前修订证据见[2026-11-18-revision](evidence/2026-11-18-revision/README.md)。旧证据仍对应旧运行器哈希，不改套新版本。

## 独立改动与检查器反例

运行参数改变的是实际传给第二个 headless 的任务，不是事后修改报告。换一个问题，仍验证提交的新文本和旧工具历史；模拟模型不会据提问生成语义回答：

```powershell
$OwnEvidence = Join-Path $BookRoot ('labs/session-reentry/.lab-runtime/own-' + [guid]::NewGuid())
$Question = 'Without calling a tool, recall the title from our previous ticket lookup.'
node --import tsx/esm (Join-Path $BookRoot 'labs/session-reentry/run.mjs') $HarnessRoot resume $OwnEvidence $Question
if ($LASTEXITCODE -ne 0) { throw "独立改动未通过：$OwnEvidence" }
```

核验检查器确实会拒绝错误证据：

```powershell
$env:BOOK_REENTRY_REPORT = Join-Path $Evidence 'report.json'
try {
  node --test (Join-Path $BookRoot 'labs/session-reentry/inspect.test.mjs')
  if ($LASTEXITCODE -ne 0) { throw '检查器反例未通过' }
} finally { Remove-Item Env:BOOK_REENTRY_REPORT }
```

一个真实输入加六种错误副本：同 PID、删请求、乱序号、改前缀哈希、虚增第二次工具执行、缺清理。检查器反例与真实 `fresh`/拒绝运行分别记录，前者不声称制造了工程故障。未提供报告路径的测试会跳过，跳过不计验收。

## 原件与限制

- `.lab-runtime/<新目录>/report.json` 含完整事件/请求、退出码、子进程 PID、执行计数、输入代码哈希、检查及清理；另存两阶段真实 JSONL 副本和各自启动探针。不要直接公开完整报告，里面可能含工作目录指令和系统提示。
- `inspect.mjs` 分开核对两进程、连续 seq、完成原因、同会话追加、旧前缀、真实新请求里的历史、关联 ID、工具计数及拒绝/清理。它不将退出 0 或 stdout 当业务正确性的证明。
- `summarize.mjs <resume-report> <fresh-report> [其他报告]` 重新检查后只输出选定的虚构工单/工具块、计数与哈希；作者公开记录见 [2026-11-18](evidence/2026-11-18/README.md)。摘要不能替代原件。
- 固定序列 `tool_call_success,success,success`，关闭自动标题、`repeatLast: false`；每组实际三次请求，没有 `script_exhausted`。正常任务并非必然一次请求。
- 每个子进程保留原45秒上限；超时为失败，保留探针/报告，不自动重试或当作用户取消。已知偶发启动问题仍未定位；本轮通过不代表它已修复。
- 临时目录隔离不等于外网阻断。没有真实 key；没有测断电、强杀后的恢复、介质损坏、跨版本迁移、并发续接、多租户或真实模型业务表现。读者验收按既有安排后置。

本实验结束会删除用于两阶段续接的临时数据；保留的 JSONL 是证据副本，不是让读者下次直接 `--session-id` 使用的现存应用会话。实际业务需要稳定且受控的 home、日志根和工作目录，不能沿用本实验的自动清理策略。
