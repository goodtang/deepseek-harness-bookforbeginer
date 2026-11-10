# 第一个业务工具：正常循环实验

这是 E1 的最小接入工程，源码基线为 `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`。仅使用虚构工单和本机模拟模型，不需要真实模型密钥。工程通过支持的 `dsh --profile headless --patch` 启动应用；运行器没有直接调用工具的 `execute` 来冒充工具循环。

## 文件与输入

| 文件 | 职责 |
| --- | --- |
| [tickets.mjs](tickets.mjs) | 普通查询函数 `lookupTicket(id)`，返回副本或 `null` |
| [plugin.mjs](plugin.mjs) | Cordis 插件，注入 `tools`，注册 `book_ticket_lookup`，声明输入、输出与模型可见内容 |
| [run.mjs](run.mjs) | 启动模拟服务和真实 profile，执行独立断言，清理本次创建的目录和直接子进程，写证据 |

固定输入为 `{"id":"TK-1042"}`，已知结果为 `{"id":"TK-1042","status":"open","title":"Invoice export failed"}`。这些数据完全虚构，没有连接工单系统。此函数的缺失记录和副本隔离在本地断言；当前真实工具循环只覆盖存在的工单。

## 运行

前提是本机已有上述基线的源码检出及可用依赖，Node 满足上游要求。本轮使用 Node `v24.12.0`。从源码仓库目录运行下面的 PowerShell 命令；两个绝对路径按实际位置替换：

```powershell
Set-Location D:/projects/deepseek-harness-local
node --import tsx/esm D:/projects/deepseek-harness-bookforbeginer/labs/first-tool/run.mjs D:/projects/deepseek-harness-local
```

成功时输出一行 JSON，包含 `"passed":true` 和 `"requests":2`；`evidence` 指向本次证据。默认写到实验目录下被 Git 忽略的 `.lab-runtime/evidence.json`，不会覆盖已归档的实测记录。运行器第三个命令行位置可指定证据输出文件。断言失败则退出非零并在可收尾的失败路径中写下失败原因；子进程有 90 秒截止，超时会终止该直接子进程。

## 实际配置

运行器在系统临时目录创建独立 `DSH_HOME` 与工作目录，向子进程显式传入虚构的 `book-mock-key` 和回环地址。临时 overlay 以绝对路径插入本书插件，并禁用 `session-title-llm`。这样本场景只编排主任务的两次请求；这不是默认 profile 的总请求数承诺，也没有证明此前外部探针的额外请求一定来自标题生成。

隔离工作目录会改变源码启动时的 TypeScript 配置发现。运行器为子进程设置 `TSX_TSCONFIG_PATH=<源码目录>/tsconfig.json`，让 workspace 包按该源码基线解析。插件中的源码导入同样绑定这一检出，是教学实验的准备设施；发布独立插件包的依赖声明与安装另在后文展开。

模拟序列为 `tool_call_success,success`，不启用 `repeatLast`。端口由系统分配。此 mock 按每次请求消费一个行为，因此新增请求会让严格断言失败。第二次回答是预设文本，不能用它评价模型是否理解业务；本实验检查的是实际工具结果进入后续请求。

## 预期与实测

| 检查项 | 预期 | 本轮实测 |
| --- | --- | --- |
| 注册 | 首次请求的 tools 数组包含真实工具 schema | 通过 |
| 执行与结果核查 | 后续请求中，非错误的 tool_result 对应同一个 tool_use；参数和结果逐字段吻合 | 通过 |
| 请求数 | 恰好两次，均完成，没有 script_exhausted | 通过 |
| 退出码 | headless 为 0，与上述行为断言分别检查 | 通过 |
| 本地函数 | 不存在或原型属性名称返回 null；修改返回副本不改固定数据 | 通过 |
| 清理 | 模拟服务关闭，直接子进程退出，本次临时目录删除 | 通过 |
| 学生复现 | 读者独立运行并对照上述证据 | 待验收 |

当前最终版本的证据见 [normal-20261110.json](evidence/normal-20261110.json)，其中记录代码 SHA-256、源码提交、工具 schema、观察到的工具结果、请求统计和清理状态。早期 [attempt-01.json](evidence/attempt-01.json) 记录隔离目录启动失败；[attempt-02.json](evidence/attempt-02.json) 是修正启动配置后、尚用字符串输出 schema 的过渡版本成功记录，不作为最终代码的验收依据。

本场景使用本机 mock 且无需真实 key；未进行断网重跑或外网连接监测，不标为“离线隔离通过”。未验证断流恢复、主动取消、真实服务、多租户、权限控制、卸载后的注册回收及跨平台表现；这些不由正常路径成功推出。E1 工程门槛通过，完整 M1 和读者验收尚未通过。

## 源码依据与许可

以下均固定到上游源码基线，源码著作权为 DeepSeek，原许可为 MIT；本目录独立编写的可执行示例为 Apache-2.0，正文遵循本仓库文字许可。没有把上游实现复制到书稿仓库。许可与来源分别见 [第三方声明](../../THIRD_PARTY_NOTICES.md)和[来源登记](../../rights/sources.json)中的 `SRC-DSH`。

- [本地插件绝对路径 overlay 教程](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/docs/user/develop/basic/index.md#register-it-in-cordisyml)。
- [defineTool：schema.ts，第 555 行](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/tools/src/schema.ts#L555)。
- [Tools.register：index.ts，第 128 行](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/tools/src/index.ts#L128)。
- [headless run：index.ts，第 322 行](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/bundle/headless/src/index.ts#L322)。
- [startMockLlmServer：index.ts，第 643 行](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/test-support/llm-mock-server/src/index.ts#L643)。
