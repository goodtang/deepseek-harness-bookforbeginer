# 第九章实验：读懂并修改真实应用组合

配合[第九章](../../chapters/第09章-插件怎样组成应用，读懂启动与配置.md)。沿用第八章的consumer、memory/file提供者和mount，只新增接收配置的entry。仍通过目标工程的dsh/headless启动，模型脚本发起book_ticket_lookup，经真实注册表与执行管线；没有替代框架。

## 环境与自己的目录

需要第二章已准备的Node/pnpm工作区和源码依赖，源码锁定fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159。以下为PowerShell；当前作者实测Windows/Node24.12.0，不表示其他平台或新机已验。书稿与源码可以分放、改目录名或含空格。已有正确变量时可以沿用，否则先输入实际位置：

```powershell
$BookRoot = [IO.Path]::GetFullPath((Read-Host '书稿仓库的实际目录').Trim('"'))
$HarnessRoot = [IO.Path]::GetFullPath((Read-Host 'Harness源码仓库的实际目录').Trim('"'))
if (-not (Test-Path -LiteralPath (Join-Path $BookRoot 'labs/profile-config/run.mjs'))) { throw '书稿目录不正确' }
if (-not (Test-Path -LiteralPath (Join-Path $HarnessRoot 'apps/cli/src/bin.ts'))) { throw '源码目录不正确' }
$Exercise = Join-Path $BookRoot ('labs/profile-config/.lab-runtime/exercise-' + [guid]::NewGuid())
node (Join-Path $BookRoot 'labs/profile-config/prepare.mjs') $Exercise
if ($LASTEXITCODE -ne 0) { throw '练习目录创建失败' }
```

prepare只新建自己的练习目录，复制虚构工单和八份补丁；不改源码或日常home，已有同名目录会拒绝。它为你的tickets.json生成实际绝对路径，不需要照抄作者的盘符。reader.patch.yml起初选择memory，留给你修改。

## 静态组合对照

```powershell
$LayerEvidence = Join-Path $BookRoot ('labs/profile-config/.lab-runtime/layers-' + [guid]::NewGuid())
node (Join-Path $BookRoot 'labs/profile-config/dump-layers.mjs') $HarnessRoot $LayerEvidence
if ($LASTEXITCODE -ne 0) { throw "配置对照失败：$LayerEvidence" }
```

脚本建立自己的临时home，实际调用公开CLI的dump命令，核对默认bundle清单、profile→home→两个命令行补丁的覆盖、未知id、!!js未求值，以及坏用户YAML时默认组合仍可导出。后续config替换整个对象，不做深层合并。default dump不接受--patch，另做明确拒绝检查。八个成功导出阶段与两类命令拒绝分别记录。

完整dump可能含系统提示，留在本机证据目录，发布前只摘自己新增的业务条目。脚本最后删除它自建的临时home；不会安装包或启动真实模型。初始化profile仍会写临时磁盘，不把它叫作完全只读。

## 运行、切换、恢复

```powershell
foreach ($Case in @('memory','file','restored')) {
  $Evidence = Join-Path $BookRoot ('labs/profile-config/.lab-runtime/' + $Case + '-' + [guid]::NewGuid())
  node (Join-Path $BookRoot 'labs/profile-config/run.mjs') $HarnessRoot $Case $Evidence $Exercise
  if ($LASTEXITCODE -ne 0) { throw "配置实验失败：$Case，$Evidence" }
  if ($Case -eq 'file') { $FileEvidence = $Evidence }
}
```

每次新的真实headless进程、模拟服务、home与工作目录。源代码入口仍是dsh CLI，run构造其源启动所需的tsx ESM加载器；不需要在书稿目录另装依赖。没有真实key；模拟凭据仅用于本机回环。无密钥不等于操作系统阻断外网。

本章共享m1/run增加S1可选的第七个位置参数extra-patch：`<source> S1 <evidence> <plugin> full <extra-patch>`。它在原设施补丁之后传入第二个真正的--patch，保存输入与SHA-256；这不是产品新增的CLI选项。不传参数时保留原路径，本轮另实跑原S1/S2/S2-exhaust/S3。旧章证据保留原文件hash，不冒充使用当前运行器。

run.mjs的summary检查入口收到的source、主工具实际提供者、四项服务行为、工具次数、后续请求工单及清理；共享运行器还逐项核对实际持久文件与观察事件、调用/结果关联。主任务两请求一次执行，服务前置检查单独计数。消费者文件和模型工具定义不变。restored补丁与memory字节相同，但三个场景各自启动新进程，不是热更新。

## 四个错误配置

```powershell
foreach ($Case in @('typo','missing-path','bad-path','disabled')) {
  $Evidence = Join-Path $BookRoot ('labs/profile-config/.lab-runtime/' + $Case + '-' + [guid]::NewGuid())
  node (Join-Path $BookRoot 'labs/profile-config/run.mjs') $HarnessRoot $Case $Evidence $Exercise
  if ($LASTEXITCODE -ne 0) { throw "反例未按预期得到证据：$Case，$Evidence" }
}
```

| 场景 | 正确的反例验收 |
| --- | --- |
| typo | 业务S1可通过，但实际memory，要求file的检查必须拒绝；本轮stderr为空 |
| missing-path | 明确缺path、无提供者与工具执行；共享S1拒绝 |
| bad-path | ENOENT、无提供者与工具执行；共享S1拒绝 |
| disabled | 组合入口没执行，无注册与执行；共享S1拒绝 |

后三组作者所测应用exit0，共享S1检查exit1；最外层反例运行器确认预期拒绝与清理完成后exit0。不能把三个退出码混成一个“通过”。未知id的静态导出另确实报not found，运行时是否打印警告不能靠猜。报告原件不修改通过标记。

## 自己完成补丁

打开$Exercise内reader.patch.yml。先原样运行reader，应返回非0，因为预期file却实际memory；原件在这次新证据目录/runtime/report.json。自己写对id、source:file与该目录tickets.json的绝对路径，再用新证据目录运行reader，应通过。核对后恢复内存补丁，再次用新证据目录运行reader，应重新拒绝。

```powershell
$ReaderEvidence = Join-Path $BookRoot ('labs/profile-config/.lab-runtime/reader-' + [guid]::NewGuid())
node (Join-Path $BookRoot 'labs/profile-config/run.mjs') $HarnessRoot reader $ReaderEvidence $Exercise
```

这次根据你正在检查的阶段判断退出码，不能在起点或恢复阶段照抄“非0就说明设施坏了”。完成版可对照file.patch.yml；记清自己是否看过它。作者起点/完成/恢复实际为1/0/1，报告中的基础S1三次都为true，正好说明基础任务通过不等于所需配置已生效。作者完成版不是读者签收。

## 检查器与证据

先得到自己成功的file场景证据，再设置该报告路径；BOOK_CONFIG_REPORT缺失时该组测试会skip，不能记验收通过：

```powershell
$env:BOOK_CONFIG_REPORT = Join-Path $FileEvidence 'runtime/report.json'
node --test (Join-Path $BookRoot 'labs/profile-config/verify.test.mjs') (Join-Path $BookRoot 'labs/m1/startup-probe.test.mjs')
```

前面的循环在file轮把实际证据目录保存为$FileEvidence；如果开启了新终端，先重新指定自己的目录，不要使用不存在的示例路径。七项配置证据测试（含六种错误副本）加三项启动诊断测试，共10项。错误副本只检查验收器，不冒称真实运行故障。

[当前选定证据](evidence/2026-11-18/README.md)固定源码/脚本hash，完整成功与失败原件保留.lab-runtime；此目录被Git忽略。每次证据与练习目录都用新名字，不覆盖旧报告。模型和临时进程已清理，练习目录是供读者继续编辑的自有文件，保留不等于临时home残留。隔离/M1、读者、新机/其他平台、页面/PDF、原偶发启动问题保持待验。
