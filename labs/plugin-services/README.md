# 第八章实验：同一工具，替换数据提供者

源码基线 `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`，沿用 TK-1042/open/Invoice export failed。`bookTickets`、TicketSource 及提供者是本书扩展，不是上游内置工单服务。通过既有 m1 运行器的真实 headless/profile/工具注册与执行管线运行，不自调用 execute 冒充集成。作者范围为已有依赖的 Windows、Node24.12.0、无真实key/本地模拟模型。

## 从任意目录开始

先准备第二章的[源码运行环境](../run-basics/SETUP.md)。以下是 PowerShell，不预设两个仓库名称、盘符或相邻位置：

```powershell
$BookRoot = (Resolve-Path -LiteralPath (Read-Host '书稿仓库的实际完整路径')).Path
$HarnessRoot = (Resolve-Path -LiteralPath (Read-Host '目标工程的实际完整路径')).Path
if (!(Test-Path -LiteralPath (Join-Path $BookRoot 'labs/plugin-services/consumer.mjs'))) { throw '书稿路径不对' }
if (!(Test-Path -LiteralPath (Join-Path $HarnessRoot 'apps/cli/src/bin.ts'))) { throw '源码路径不对' }
Set-Location -LiteralPath $HarnessRoot
$MemoryEvidence = Join-Path $BookRoot ('labs/plugin-services/.lab-runtime/memory-' + [guid]::NewGuid())
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot S1 $MemoryEvidence (Join-Path $BookRoot 'labs/plugin-services/memory-entry.mjs')
if ($LASTEXITCODE -ne 0) { throw "内存组合未通过：$MemoryEvidence" }
$Memory = Get-Content -LiteralPath (Join-Path $MemoryEvidence 'report.json') -Raw | ConvertFrom-Json
$Memory.executionAudit | Where-Object { $_.type -in @('composition-state','provider-query','consumer-turn-end','consumer-unloaded','provider-unloaded') }
```

JSON组合与空闲阶段替换分别运行，证据目录须新建：

```powershell
$FileEvidence = Join-Path $BookRoot ('labs/plugin-services/.lab-runtime/file-' + [guid]::NewGuid())
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot S1 $FileEvidence (Join-Path $BookRoot 'labs/plugin-services/file-entry.mjs')
if ($LASTEXITCODE -ne 0) { throw "JSON组合未通过：$FileEvidence" }
$LifecycleEvidence = Join-Path $BookRoot ('labs/plugin-services/.lab-runtime/lifecycle-' + [guid]::NewGuid())
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot S1 $LifecycleEvidence (Join-Path $BookRoot 'labs/plugin-services/lifecycle-entry.mjs')
if ($LASTEXITCODE -ne 0) { throw "替换未通过：$LifecycleEvidence" }
$Lifecycle = Get-Content -LiteralPath (Join-Path $LifecycleEvidence 'report.json') -Raw | ConvertFrom-Json
$Lifecycle.executionAudit
```

三个场景各2次主请求、1次真实工具执行、正确持久结果与后续请求。消费者文件完全相同。lifecycle在应用启动的空闲检查点卸载内存提供者，观察消费者PENDING/工具撤销，再挂JSON提供者并观察消费者ACTIVE；实际查询只经过file，旧监听不收到回合结束。没有在查询执行中热替换，也没有持有数据库连接或后台文件watcher。

## 文件与职责

| 文件 | 职责 |
| --- | --- |
| definition.ts | Ticket、TicketSource、Context类型扩展，规定lookup/副本/null/取消 |
| memory-provider.mjs | 复用原lookupTicket实现服务 |
| file-provider.mjs、file-data.mjs | 加载时读/校验JSON，再提供服务；文件变化不会自动重载 |
| consumer.mjs | 注入tools/bookTickets，注册原工具并订阅回合结束 |
| composition.mjs、三个entry | 组合提供者与同一消费者，检查真实fiber/服务/工具状态 |
| runtime.ts、package.json | 外部书稿目录的ESM/源码导入适配；不替代Cordis注册或inject |
| audit.mjs | 本地教学测量，不是新模型输入或业务数据库 |
| prepare-reader.mjs、reader-start.mjs | 创建独立练习目录，保留实际路径并由学生实现lookup |
| verify.mjs、verify.test.mjs | 核对真实结果/来源/生命周期及六种错误证据副本 |

## 自己完成提供者

```powershell
$ReaderDirectory = Join-Path $BookRoot ('labs/plugin-services/.lab-runtime/my-provider-' + [guid]::NewGuid())
node (Join-Path $BookRoot 'labs/plugin-services/prepare-reader.mjs') $ReaderDirectory
if ($LASTEXITCODE -ne 0) { throw '练习目录创建失败' }
# 编辑 ReaderDirectory/provider.mjs，完成 lookup 中的 TODO。
$ReaderEvidence = Join-Path $BookRoot ('labs/plugin-services/.lab-runtime/reader-' + [guid]::NewGuid())
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot S1 $ReaderEvidence (Join-Path $ReaderDirectory 'entry.mjs')
if ($LASTEXITCODE -ne 0) { throw "提供者未通过：$ReaderEvidence" }
```

准备脚本把模板相对导入改为该书稿位置的file URL，创建自己的JSON数据和组合入口，拒绝覆盖已有目录。它不填lookup。学生需检查取消、精确匹配id、找到返回副本/找不到返回null；原消费者不改。不要把模板单文件随意移动后，手工写死作者盘符修导入。

作者实际填写后的模块在本机忽略目录及私有归档，公开字段汇总见[当前证据](evidence/2026-11-18/README.md)；正文折叠区给出核对片段。工具正常回答还需核查provider-query为reader、实际调用1次、持久结果与第二请求正确，不只查stdout。

## 检查与限制

```powershell
$env:BOOK_PLUGIN_REPORT = Join-Path $LifecycleEvidence 'report.json'
try {
  node --test (Join-Path $BookRoot 'labs/plugin-services/data.test.mjs') (Join-Path $BookRoot 'labs/plugin-services/verify.test.mjs')
  if ($LASTEXITCODE -ne 0) { throw '解析/生命周期检查器未通过' }
} finally { Remove-Item Env:BOOK_PLUGIN_REPORT }
```

完整生命周期报告已给定时共14项、无跳过；未提供报告时生命周期组会跳过，不算验收。`verify.mjs <memory> <file> <lifecycle> <reader> <missing-inject> <bad-file>` 的参数均为实际report.json，核查四正常组合和两真实错误配置。六错误证据副本不冒充六次真实工程故障。

真实错误例中，省略消费者的bookTickets依赖会使它在无服务时提前ACTIVE；坏JSON会阻止提供者注册。本轮它们都出现entry未激活警告，headless仍可退出0并生成固定模拟答复，最终由业务/组合断言拒绝；不能写成“配置错误一定让应用退出1”。复现时只改自己的副本，不修改本仓库正常样例或原证据。

定义与源码适配器另做strict消费端类型检查：使用本机已有vendor构建声明文件，错误的Promise<string>提供者被拒绝。它不等于上游源码重新构建、所有JS提供者静态检查或新机安装通过。源码真实运行仍走固定基线源码；runtime适配器不创建独立服务容器、不引入第二套Cordis实例。

每次实验使用隔离home/workspace/日志根，结束核对进程/模拟服务/临时根清理，完整提示与会话留在忽略目录，不直接公开。原45秒限制不变；已有偶发启动问题未定位，超时为失败。外网隔离/M1、GitHub/PDF、读者、新机/其他平台、并发热替换和真实远端业务仍未验。
