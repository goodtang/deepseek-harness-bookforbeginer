# 第十章实验：受控关闭与独立结果核查

配合[第十章](../../chapters/第10章-从查询到关闭，怎样控制一次业务修改.md)。本章新建虚构业务服务与book_ticket_close，沿用TK-1042与目标工程真实dsh/headless、工具管线、approval服务及Session持久记录；不改前章只读函数/提供者或上游。业务身份、确认、幂等及结果核查责任明确，不说Harness自动实现工单事务。

## 环境与路径

沿用第二章已安装依赖的源码基线fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159。作者Windows/Node24.12.0已测，不等于新机或其他平台。已有正确变量可沿用，否则用PowerShell输入实际位置：

```powershell
$BookRoot = [IO.Path]::GetFullPath((Read-Host '书稿仓库实际目录').Trim('"'))
$HarnessRoot = [IO.Path]::GetFullPath((Read-Host 'Harness源码实际目录').Trim('"'))
if (-not (Test-Path -LiteralPath (Join-Path $BookRoot 'labs/write-ticket/run.mjs'))) { throw '书稿目录不正确' }
if (-not (Test-Path -LiteralPath (Join-Path $HarnessRoot 'apps/cli/src/bin.ts'))) { throw '源码目录不正确' }
```

plain Node运行run即可。它先相对当前目录解析source/evidence为绝对路径，再从源码解析tsx ESM加载器启动driver；不需要在书稿另装依赖。所有输出目录必须新建，已有同名目录会拒绝。无真实key，只接本机回环的脚本模型，不表示外网已经被阻断。

可选最后一个参数是读者自己的领域模块路径，例如 `node run.mjs <源码目录> empty-title <新证据目录> <自己的domain.mjs>`。运行器只把该模块导出的transition交给本机业务服务，保留原有工具/确认/执行链路，记录模块路径、SHA-256及reader-domain.mjs副本。模块由你自己编写并运行，不从模型输出或外部上传文件中加载。

## 运行一组与读取原结果

```powershell
$AllowEvidence = Join-Path $BookRoot ('labs/write-ticket/.lab-runtime/allow-' + [guid]::NewGuid())
node (Join-Path $BookRoot 'labs/write-ticket/run.mjs') $HarnessRoot allow $AllowEvidence
if ($LASTEXITCODE -ne 0) { throw "实验失败：$AllowEvidence" }
$Allow = Get-Content -LiteralPath (Join-Path $AllowEvidence 'report.json') -Raw | ConvertFrom-Json
$Allow.finalBusiness.ticket
$Allow.finalBusiness.writeCount
```

accepted表示本场景的全部行为与清理符合预期，不一概等于业务修改成功。看scenario与每阶段真实工具/approval事件、HTTP回执、业务状态和物理business.json。stdout是固定模拟答复，拒绝场景也可能一样。

每phase保存真实argv的launch.json、补丁、stdout/stderr、audit/观察事件和真正的session.jsonl；原始请求和报告包含系统提示，不直接提交到公共书稿。最终business.json是从后台实际文件复制，核对它与后台状态一致；不是只把期望值写入报告。

## 十三类场景

```powershell
foreach ($Case in @('allow','read-only','reject','unavailable','never','server-denied','stale','wrong-call','duplicate','lost-after','lost-before','cancel-before','cancel-after')) {
  $Evidence = Join-Path $BookRoot ('labs/write-ticket/.lab-runtime/' + $Case + '-' + [guid]::NewGuid())
  node (Join-Path $BookRoot 'labs/write-ticket/run.mjs') $HarnessRoot $Case $Evidence
  if ($LASTEXITCODE -ne 0) { throw "场景未通过：$Case，$Evidence" }
}
```

| 场景 | 应实际观察到什么 |
| --- | --- |
| allow | 当前命令确认allowed-once，真实execute1，close次数1 |
| read-only | 工具侧只读拒绝，无approval/execute/业务关闭 |
| reject | 真实approval拒绝，execute0，工单open |
| unavailable | 不装应答器，真实服务返回unavailable，未写 |
| never | 显式--approval-policy never，真实服务先拒绝而不等待人 |
| server-denied | 工具侧允许并确认，服务端身份仍只读，明确拒绝写 |
| stale | 实际待确认时推进业务版本，允许后返回VERSION_CONFLICT |
| wrong-call | 错callId的确认控制请求被409拒绝，再拒绝当前问题 |
| duplicate | 两个新Session执行同一operationId，同请求再确认，后台只关闭1次 |
| lost-after | 先提交状态/回执后断回复，工具unknown，独立GET确认已提交；第二Session重发原操作得到去重回执 |
| lost-before | 请求到达但提交前断回复，工具unknown，GET无记录，调用方仍保持unknown |
| cancel-before | 真正待确认时调用Agent.cancel，aborted/user、execute0、业务未变 |
| cancel-after | 后台已提交并保持回复时调用Agent.cancel，任务aborted/user，但GET与文件仍显示提交 |

控制只依据待确认问题或后台已提交/保持回复的状态推进，20ms轮询只是检查这些条件；不拿等待时长当证据。45秒看门狗只负责终止失控实验，不得记成用户取消。程序化answerer不是读者或维护者对真实业务的授权。

业务身份在控制配置中，HTTP服务用随机实验令牌确定身份，不从模型声明管理员。模型只提供id/version/operationId。控制端口另有随机测试凭据，生成在自有临时目录；完整本机文件不直接公开。课堂单用户/单待确认通道，不等于生产审批系统。

## 一次提交的具体范围

业务服务把工单与操作账本一起写入新JSON后rename，处理段同步无跨await交错，仅保证该单进程隔离实验中的逻辑一致。每组从新状态初始化，不提供既有业务文件的重启加载；不验证fsync、断电恢复、多实例锁或生产数据库事务。writeCount只计本工具的关闭，不计制造stale时的版本推进。

未知结果必须继续用原operationId查回执，或在业务服务允许安全重发时沿用原键。not-found不能自动改成确定失败；回执state/operationId/目标状态和版本必须匹配。业务权限拒绝或版本冲突可以作为普通工具值返回not-written，此时isError=false也不表示关闭成功。

## 自己写核查函数

先独立跑lost-after与lost-before，分别保留$LostAfterEvidence、$LostBeforeEvidence；正文有两条完整命令。复制reader-start.mjs到自有新.mjs，补inspectReceipt(receipt,expected)，再运行：

```powershell
node (Join-Path $BookRoot 'labs/write-ticket/check-reader.mjs') $MyReceiptModule (Join-Path $LostAfterEvidence 'report.json') (Join-Path $LostBeforeEvidence 'report.json')
```

起点主动报未完成；完成版应通过6项，含两种真实HTTP回执与四个错误字段副本。摘要不能替代读者判断，错误副本也不冒充真实后台事故。正文折叠处有完整参考；看过提示和独立完成要分别记录。

## 自己修改写入规则与检查原记录

正文10.2提供实际Session JSONL字段提取与手写断言，用本次callId连接调用/确认/结果，用确认id配对asked/decided，用operationId核对独立GET回执和物理业务文件。10.3另核对真实用户取消与业务已提交并存。报告中的布尔通过不能替代这些步骤。

正文10.3的业务改动练习先把domain.mjs复制到自有新文件，只在transition的版本检查后、写状态前增加“空白标题拒绝”的业务规则。顺序为起点empty-title拒绝验收→修改后allow/empty-title/duplicate通过→备份后恢复原代码、empty-title再次拒绝→恢复自己的完成版。起点与恢复组应用实际完成且关闭1次，证明原规则没有拦住空标题；不是用启动失败冒充反例。empty-title要求明确提供自己的模块，后台标题设为三个空格，工具仍收到原参数与本次真实确认。

完成后的empty-title应为not-written/TITLE_REQUIRED，执行体1、关闭0、无账本；allow关闭1，duplicate两Session仍关闭1。详细字面命令、预测和折叠提示见正文，不需要修改上游或原有domain.mjs。自己的模块和备份保留；业务服务/模型/应用与临时home仍由实验负责清理。

## 代码检查与证据

先明确生成自己的cancel-after报告。即使前面循环跑过十三类，这里也不假定你已经定义了另一个路径变量：

```powershell
$CancelAfterEvidence = Join-Path $BookRoot ('labs/write-ticket/.lab-runtime/cancel-after-' + [guid]::NewGuid())
node (Join-Path $BookRoot 'labs/write-ticket/run.mjs') $HarnessRoot cancel-after $CancelAfterEvidence
if ($LASTEXITCODE -ne 0) { throw '提交后取消实验未通过' }
$env:BOOK_CLOSE_REPORT = Join-Path $CancelAfterEvidence 'report.json'
$env:BOOK_RULE_REPORT = Join-Path $RuleEvidence['empty-title'] 'report.json'
if (-not (Test-Path -LiteralPath $env:BOOK_CLOSE_REPORT) -or -not (Test-Path -LiteralPath $env:BOOK_RULE_REPORT)) { throw '先完成取消实验与自己的业务规则练习' }
node --test (Join-Path $BookRoot 'labs/write-ticket/domain.test.mjs') (Join-Path $BookRoot 'labs/write-ticket/business.test.mjs') (Join-Path $BookRoot 'labs/write-ticket/verify.test.mjs')
if ($LASTEXITCODE -ne 0) { throw '领域或证据检查失败' }
```

$RuleEvidence来自正文三场景循环，记录你自己的empty-title证据目录。两个BOOK变量缺失时相应证据测试会skip，不能记通过。8项领域、1项实际HTTP规则接入、9项取消证据/错误副本、4项业务规则证据/错误副本，共22项，完整执行应0skip。另有读者回执完成版6项核查，不混算成真实业务场景数量。

[当前修订证据](evidence/2026-11-27-revision/README.md)记录原13类新版本回归、业务规则起点/三组完成/恢复、正文命令与字段核查；[原初稿证据](evidence/2026-11-26/README.md)保留当时适用版本，不改套新运行器。完整原件留.lab-runtime与私有归档。首次看门狗失败、schema接入错误和回执核查的RED都保留；没有因后来通过声称根因已解。上游和共享m1实现未改，本章只复用其观察/启动探针。

reader文件为自己的学习产物，明确保留；模型服务、业务服务、应用子进程和临时home/root退出并清理。读者/新机/其他平台、页面/PDF、外网隔离/M1、原启动问题及生产范围仍未验，当前只记初稿及限定实验完成。
