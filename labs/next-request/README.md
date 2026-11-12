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

字段摘录只发布本章需要的调用、结果和事件类型/顺序，省略系统提示、工作目录和其他请求正文；不是完整 HTTP 报文或完整会话。inputSha256 标明本次完整 report.json/durable-0.jsonl 的字节指纹，供本地核对同一原件；指纹不代替内容审查。读者复跑后能在自己的 Evidence 目录检查完整原件，时间、会话 ID 和路径通常不同。

模拟模型按 tool_call_success,success 固定序列行动，最后的 M1 query completed. 也是固定文字。通过只能证明真实管线把这份正确工具结果送到第二次请求，并完成本场景；不能证明模型理解了工单、真实服务可用、其他工具调用次数相同，或读者已经独立掌握。独立临时 home/工作目录已清理；外网阻断隔离、新机、其他系统、真实模型和读者验收未完成，不据此判完整 M1 通过。

程序和完整日志位于各自目录，不在第五章重新复制一套 m1 运行器。新增讲解遵循本书正文许可，独立脚本采用 Apache-2.0；字段名和行为解释对应目标源码 MIT 许可，见[第三方声明](../../THIRD_PARTY_NOTICES.md)。
