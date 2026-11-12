# M1 正常、断流与主动取消实验

本目录补充第四章的 M1-S1/S2/S3 功能实测与持久会话核对。**功能路径已经验证，外网隔离没有通过验收，M1-E 与完整 M1 仍未通过。**用户于 2026-11-12 确认目前没有可用隔离环境，先保留该项待完成；本轮没有安装环境或更改全局网络配置。

## 运行前提与入口

目标源码基线 fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，跟踪文件干净，已有可用依赖。运行器逐次检查源码版本，使用同一个工单插件和真实 headless profile，不直接调用 execute 代替集成。

沿用第二章校验过的 BookRoot/HarnessRoot，在 PowerShell 中运行一个场景。目录必须是新目录，不覆盖已留档原件：

```powershell
$M1Evidence = Join-Path $BookRoot 'labs/m1/.lab-runtime/S2-01'
Set-Location -LiteralPath $HarnessRoot
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot S2 $M1Evidence
$LASTEXITCODE
Set-Location -LiteralPath $BookRoot
```

把 S2 与目录末段分别换成 S1、S2-exhaust 或 S3 可运行相应场景。它们无需真实模型 key，仅连接本机模拟服务；这不是已经完成外网阻断的运行环境。运行器报告 functionalPassed 与 m1EngineeringAccepted 两个不同字段，后者目前始终为 false。

| 场景 | 脚本行为 | 应用实际退出码 | 工具 execute 次数 | 持久 turn/end |
| --- | --- | --- | --- | --- |
| S1 正常 | tool_call_success → success | 0 | 1 | completed |
| S2 断流后恢复 | partial_disconnect → tool_call_success → success | 0 | 1 | completed |
| S2-exhaust 上限对照 | partial_disconnect → partial_disconnect | 1 | 0 | error / TRANSPORT |
| S3 主动取消 | tool_call_success → stall，控制端取消 | 1 | 1 | aborted / user |

以上四组的功能断言均通过，驱动器退出 0；这不把应用本身的失败/取消退出改写为成功，也不代表隔离验收通过。

## S2：故障、策略和部分输出

运行器显式配置 provider retryPolicy：normal、maxRetries=1、10 ms 固定 backoff，禁用自动标题请求；不是依赖默认五次重试或无限重试来碰巧成功。

[S2 原件](evidence/release/S2/report.json)的第一次请求实际发送 7 个 SSE 事件后 reset；持久日志记录一次 llm/retry，原因 TRANSPORT、maxRetries=1，再有一次 llm/retry-started。随后真实工具执行一次，结果进入后续请求，最终 completed。请求总数为 3，没有脚本耗尽。

故障片段带唯一标记 BOOK_PARTIAL_MUST_NOT_BECOME_A_SUCCESS。检查器核对该标记没有进入后续请求消息、已提交的 assistant/message 或最终 stdout，避免把失败片段当成成功答复。失败诊断本身可以记在会话记录里，不能据此认定片段已经交给模型继续使用。

[S2-exhaust](evidence/release/S2-exhaust/report.json) 连续两次断流，只重试一次后终止；请求为 2 次，业务工具为 0 次，最终 error/TRANSPORT，应用退出 1。这个对照验证重试预算的边界，不将成功与失败都无条件计为通过。

## S3：在可观察等待点主动取消

[observer.mjs](observer.mjs) 通过插件加载，使用公开 Agent.cancel API；[run.mjs](run.mjs) 作为外部控制端发出本机 HTTP POST。它不是用 kill、服务端自己断开或自然超时冒充取消。

| 本轮实际顺序 | 证据 |
| --- | --- |
| 第一次请求提出工单查询 | tool/call 与 tool/result 已落盘，execute=1 |
| 第二次请求进入 stall | mock 的第 2 次请求明确记录 stalled |
| 控制端发 POST /cancel | controlResponse.status=200、accepted=true |
| 插件调用 cancel({ kind: 'user' }) | 观察原件记录会话 ID 和 atSeq=22 |
| 当前执行结束 | 持久 turn/end.seq=24，reason 为 aborted/user |
| 不再继续请求或业务操作 | 请求恰好 2 次、工具仍为 1 次、没有重试事件 |

[S3 原件](evidence/release/S3/report.json)还核对 watchdogExpired=false。45 秒看门狗仅为失败收尾保障，触发时不允许场景通过。20 ms 间隔只用于轮询实际 stalled 事件；不是等待固定时间后假定已经进入目标阶段。

取消发生在只读查询已经完成、第二次模型请求等待期间，因此已发生的查询不会“倒退”为没执行。这个实验不证明写操作可被撤销，也不覆盖工具内部执行中途的取消。

## 持久 Session 核对

本轮覆盖 session-persistence-jsonl 的 root 到独立临时目录，并显式设 compression=none。应用自然结束后读取真实落盘的 session JSONL，复制到证据目录，再删除本轮原目录；不是仅保存内存快照。

每组 release 目录包含：

- overlay.yml：实际 profile 补丁，包括有界重试、持久化位置和两个实验插件。
- durable-0.jsonl：原始持久文件，头部为实际格式版本 4，随后是已提交事件。
- observed-events.jsonl：独立观察的 session/event 和控制触发记录。
- report.json：源码和脚本哈希、实际请求、应用退出、控制响应、独立执行记录、会话核对与清理。

检查器比较持久事件和观察事件逐项相同，核对一次真实 tool/call、对应 tool/result、业务三个字段、唯一 turn/end；S2 另核对重试，S3 另核对用户取消原因、触发序号及会话身份。[汇总核对](evidence/release/summary.json)保存这些原件及当前脚本的哈希。

Session 原件包含目标工程产生的系统提示和工具说明，这些源自 SRC-DSH 的文字保留原 MIT 权利，并非全部改授权为本书图文许可。虚构工单与本书独立代码仍遵循各自登记；没有真实业务数据或真实凭据。

## 清理和适用范围

每组独立创建 home、工作目录、持久目录和模拟脚本。成功、失败和取消都清理模拟服务、直接应用子进程及临时根目录，证据副本有意保留。应用退出与 mock.close 完成分别记录；请求 outcome=stalled 表示模拟服务执行过的行为，不作为套接字目前仍存活的判断。

当前验证为 Windows x64、Node v24.12.0、本机模拟模型及真实 Harness。不能推广为其他平台、真实模型选工具或产品部署的结论。

## 外网隔离仍待验收

[只读预检](evidence/isolation-preflight.json)未找到 docker/podman/WindowsSandbox，WSL 可执行文件虽存在但未安装可用子系统；Node 当前帮助没有 allow-net 网络权限选项。这只是可用性盘点，不证明所有可选隔离方案都不可行，更不构成网络阻断。

[isolation-preflight.mjs](isolation-preflight.mjs)只查询系统能力，不安装程序、不修改防火墙。下一环境必须在允许必要回环通信的同时阻断外部网络，并用真实允许/拒绝探针验证；然后将 S1/S2/S2-exhaust/S3 复跑，补齐隔离证据。当前没有这项证据，m1EngineeringAccepted 仍为 false，M1-R 读者验收也未执行。

## 初始失败探针

[probe-S1](evidence/probe-S1/report.json)记录首次观察插件在启动阶段等待未就绪副作用，应用未进入请求、45 秒看门狗触发。它不是主动取消成功。该次[观察插件原件](evidence/probe-S1/observer-attempt.mjs)与报告中的哈希一致；随后改为监听就绪时发布控制端地址，不在 apply 内等待激活后的就绪，恢复了启动。

probe-S1-02、probe-S2、probe-S3 和 current 下的探针保留各自代码哈希。release 才是当前严格会话断言及重复目录清理修复版本；verified 保留修复前的严格会话探针；不把修复后的通过倒算到首次失败探针。

源码依据固定到基线：[Agent.cancel](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/agent-loop/src/agent.ts#L191)、[重试策略](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/llm/llm-retry/README.md)、[会话持久化](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/session/session-persistence-jsonl/README.md)。许可与来源见 [rights/sources.json](../../rights/sources.json)。

重复证据目录的拒绝路径也做了[修复前](evidence/cleanup-collision-before.json)/[修复后](evidence/cleanup-collision-after.json)对照：先验证输出目录可新建，再分配临时根目录；拒绝覆盖时不再遗留本轮临时目录。早期探针原件保留，不倒写为修复后结果。
