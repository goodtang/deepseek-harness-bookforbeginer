# 第五章实验：把同一次工具结果对到下一次请求

本实验沿用第四章的 book_ticket_lookup 与 TK-1042，不增加工具或改动上游。运行设施复用 [M1 正常场景 S1](../m1/README.md)，通过真实 headless profile、工具注册及执行管线，保留两次请求和真实持久 Session。新增 inspect.mjs 只做事后核对，不向应用提供或修改请求。

## 复跑与核对

沿用第二章已经校验的 PowerShell 变量 BookRoot/HarnessRoot。新终端先重新填写和验证路径。Evidence 必须是尚不存在的目录；重复实验换目录，不删除已有证据。

```powershell
$Evidence = Join-Path $BookRoot 'labs/next-request/.lab-runtime/S1-01'
Set-Location -LiteralPath $HarnessRoot
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot S1 $Evidence
$LASTEXITCODE
Set-Location -LiteralPath $BookRoot
node labs/next-request/inspect.mjs $Evidence (Join-Path $Evidence 'excerpt.json')
$LASTEXITCODE
node labs/next-request/check.mjs $Evidence (Join-Path $Evidence 'checks.json')
$LASTEXITCODE
```

三条命令都应退出 0。第一条建立真实运行证据，第二条比较请求和持久结果，第三条检查五份有意改错的内存副本能否被拒绝。第三条退出 0 表示“正常原件通过，五份改错副本均遭拒绝”，不是错误业务运行成功。inspect/check 的输出文件采用独占创建，不覆盖原件；省略最后的输出路径可只在终端查看。

检查器专用于当前基线的 S1：第一次有工具定义但无调用/结果历史；第二次有一对按顺序且 ID 对应的调用与结果；三个工单字段正确；持久 tool/result 内容逐项等于线上请求中的结果内容；一次业务 execute、一个 turn、两个 step，应用退出与清理分别通过。它不是通用会话验证器，不支持用 S2/S3 或 missing 场景替代 S1。

## 作者记录与范围

作者于 2026-11-12 在已有 Windows x64、Node v24.12.0 环境，针对源码 fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159 新跑 S1；应用退出 0，2 次请求、1 次 execute、1 个 turn、2 个 step，持久结果与第二请求匹配。检查器的五个反例均拒绝：[检查记录](evidence/2026-11-12/checks-final.json)、[字段摘录](evidence/2026-11-12/excerpt.json)。反例仅改内存副本，没有向运行中的 Harness 注入故障。

2026-11-13 修订 inspect.mjs 增加显式 summary 预期后，新代码的正常核对与五项反例见[当前检查](evidence/2026-11-13/checks.json)；上述 12 日代码哈希属于历史版本，不覆盖改写。

字段摘录只发布本章需要的调用、结果和事件类型/顺序，省略系统提示、工作目录和其他请求正文；不是完整 HTTP 报文或完整会话。inputSha256 标明本次完整 report.json/durable-0.jsonl 的字节指纹，供本地核对同一原件；指纹不代替内容审查。读者复跑后能在自己的 Evidence 目录检查完整原件，时间、会话 ID 和路径通常不同。

模拟模型按 tool_call_success,success 固定序列行动，最后的 M1 query completed. 也是固定文字。通过只能证明真实管线把这份正确工具结果送到第二次请求，并完成本场景；不能证明模型理解了工单、真实服务可用、其他工具调用次数相同，或读者已经独立掌握。独立临时 home/工作目录已清理；外网阻断隔离、新机、其他系统、真实模型和读者验收未完成，不据此判完整 M1 通过。

程序和完整日志位于各自目录，不在第五章重新复制一套 m1 运行器。新增讲解遵循本书正文许可，独立脚本采用 Apache-2.0；字段名和行为解释对应目标源码 MIT 许可，见[第三方声明](../../THIRD_PARTY_NOTICES.md)。

## 真实修改 render 并恢复

按第五章 5.2 把 start/plugin.mjs 复制到本目录的 .lab-runtime 中，再修改自己的副本。保持该层级才能使用 ../render-support.mjs 和 ../../first-tool/tickets.mjs 两条导入。起点完整可运行，原函数、输出 schema、工具名均沿用第四章。

新增 renderTicket 先处理 null，正常路径把完整 value 转成 JSON。只把 JSON.stringify(value) 改成 JSON.stringify({ id: value.id, title: value.title })，就得到摘要；不要删除业务返回字段。使用同一工作文件依次跑 full、summary、恢复后的 full，每轮新证据目录。运行器接受路径参数，不能仅编辑文件却继续加载默认插件。

```powershell
Set-Location -LiteralPath $HarnessRoot
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot S1 $FullEvidence $RenderPlugin full
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot S1 $SummaryEvidence $RenderPlugin summary
node --import tsx/esm (Join-Path $BookRoot 'labs/m1/run.mjs') $HarnessRoot S1 $RestoredEvidence $RenderPlugin full
Set-Location -LiteralPath $BookRoot
node labs/next-request/compare-render.mjs $FullEvidence $SummaryEvidence $RestoredEvidence
```

这里汇总三条运行命令，中间两次编辑不能省略；变量、复制、预测和恢复步骤在正文逐项说明。compare-render 检查三个运行各自的请求、真实持久文件和 render 测量，以及业务值未变、插件确实改动并精确恢复。检查器不接受重复传三份正常原件来代替修改实验。inspect 单独检查摘要目录时，在可选输出文件之后再传 summary：`node labs/next-request/inspect.mjs $SummaryEvidence (Join-Path $SummaryEvidence 'excerpt.json') summary`；默认仍是 full。

render-support 只包住提交给真实 defineTool 的 render 回调，记录管线传入的业务值和返回内容后原样委托；没有直接调用业务实现替代真实流程。execution.jsonl 中新增 render 测量项，不加入产品会话或模型消息。三次结果见[实测比较](evidence/2026-11-13/render-comparison.json)，源码快照与范围见[证据说明](evidence/2026-11-13/README.md)。启动诊断及旧四场景回归见[修订核对](evidence/2026-11-13/revision-verification.json)。
