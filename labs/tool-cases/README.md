# 第四章工具接入与对照实验

对应[第四章](../../chapters/第04章-第一个业务工具.md)。本目录的业务与数据均为本书独立教学示例；应用经目标工程真实 headless profile 启动，工具经过真实注册、参数校验和执行管线，不以直接调用 execute 代替集成。

## 文件与工作目录

[start/plugin.mjs](start/plugin.mjs) 为工单起点，[stages/plugin.mjs](stages/plugin.mjs) 为完成快照。学生按 4.2 复制到 `.lab-runtime/my-plugin.mjs`，保留同层级的相对导入。[support.mjs](support.mjs) 准备源码加载并记录 execute 的实际进入；[run.mjs](run.mjs) 驱动模拟服务、profile 和检查。

库存练习从 [start/inventory.mjs](start/inventory.mjs) 和 [start/inventory-plugin.mjs](start/inventory-plugin.mjs) 复制到 `.lab-runtime/my-inventory.mjs` 与 my-inventory-plugin.mjs；参考答案为 [inventory.mjs](inventory.mjs) 和 [inventory-plugin.mjs](inventory-plugin.mjs)，本地检查器为 [check-inventory.mjs](check-inventory.mjs)。参考插件与工作文件不在同层级，正文给出需要保留的导入路径。

原 first-tool 工程、第三章代码和历史报告未修改。source 基线必须是 fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159 且跟踪文件干净，已有可用依赖。读者使用实际 BookRoot/HarnessRoot，精确 PowerShell 命令在正文；本轮未验证新机安装或其他操作系统。

## 场景入口

运行参数为 `<源码根目录> <场景名> <新的证据目录> [插件文件]`。从源码根目录用 `node --import tsx/esm` 启动，最后一项传学生工作文件；省略则选明确的场景快照。新证据目录必须不存在，不覆盖旧记录。

| 场景 | 默认快照与输入 | 当前预期 |
| --- | --- | --- |
| start | 空 apply，不发工具调用 | 一次直接回答、工单定义缺席、execute=0 |
| normal | 工单完成版，id=TK-1042 | 正常记录，execute=1 |
| missing | 工单完成版，id=missing | 非错误 null，execute=1 |
| invalid-argument | 工单完成版，id 为数字 1042 | 真实参数错误，execute=0 |
| unregistered | 空 apply，仍发出工单调用 | 定义缺席、真实未知工具错误、execute=0 |
| inventory-zero | 库存插件，SKU-1001 | 成功的零库存对象，execute=1 |
| inventory-missing | 库存插件，SKU-missing | 成功的 null，execute=1 |
| inventory-positive | 库存插件，SKU-1002 | 成功的库存 12 对象，execute=1 |
| audit-loss | 正常查询完成后故意删除测量文件 | 运行器必须失败，不把丢失记录当 0 |

除 start 外，每个业务场景脚本编排两次请求。错误工具调用也可能由模型继续回答，本实验四种工单场景的应用均退出 0；运行器只有在独立行为断言及清理通过后才退出 0。audit-loss 是预期拒绝实验，运行器退出 1，报告 passed=false；不能将其当成功业务结果。

## 真实执行记录与可靠性

support 中的 defineTool 仍调用目标工程的 defineTool，只在传入实际 execute 回调开始处追加测量记录，然后委托原回调；不自行完成参数校验或调用业务函数冒充执行。就绪标记在支持模块初始化时写入，记录文件由运行器放在本次隔离根目录内。正常回调必须进入一次；参数错误必须有就绪标记而没有 execute 记录。

运行器保留输入、工具声明、调用/结果对应、应用退出、stdout、测量记录、源码和代码哈希，以及模拟服务、直接子进程和临时目录清理。实际 overlay.yml 指出加载谁；记录是本地实验测量，不加入模型可见内容或产品会话协议。

[audit-loss](evidence/completion/audit-loss/report.json) 故意删除文件后检查失败，证明测量缺失不能被默认为没有执行。该计数只覆盖本实验提供的工具回调，不统计其他内置工具或进程的所有函数。run.mjs 本身包含明确的行为断言；本地库存错误注入另见 [inventory-local.json](evidence/completion/inventory-local.json)。

## 当前完整实测

本目录 summary 的正文哈希对应 116a18a 的初稿版本；新增 M1 配套与两处文字修订后，工具实验代码和原始结果不变，不改写旧 summary。现行文稿及新增故障/取消证据的对应核对见 [M1 配套](../m1/README.md)。

[汇总检查](evidence/completion/summary.json)保存当前代码/正文哈希和各原件的校验。正文 4.3 摘录自 [normal](evidence/completion/normal/report.json) 的实际字段，调用编号为 mock-call-1，未为示例重写。

工单对照原件：[missing](evidence/completion/missing/report.json)、[invalid-argument](evidence/completion/invalid-argument/report.json)、[unregistered](evidence/completion/unregistered/report.json)。库存参考解：[零库存](evidence/completion/inventory-zero/report.json)、[缺失商品](evidence/completion/inventory-missing/report.json)、[非零库存](evidence/completion/inventory-positive/report.json)。作者工作文件复现：[零库存](evidence/completion/reader-inventory-zero/report.json)、[缺失商品](evidence/completion/reader-inventory-missing/report.json)、[非零库存](evidence/completion/reader-inventory-positive/report.json)。

最后的[正常工单回归](evidence/completion/normal-regression/report.json)及[原 first-tool 回归](evidence/completion/legacy-regression.json)分别验证新测量设施与旧正常工程。全部作者复核不代表学生独立试读；正文保留未填写的学生预测/实际结果。

## 历史范围与尚未验收

[a-checks.json](evidence/a-checks.json) 和 [a-reader-checks.json](evidence/a-reader-checks.json) 保留最初 A 版的正文及代码哈希；其余 a-* 原件同样不覆盖。之后 support 和 run 增加执行测量及新场景，旧报告不能用来声称这些新增能力当时已验证。当前完整验证看 completion 目录。

当前仅 Windows x64、Node v24.12.0、本机 mock 与真实 Harness 的指定路径。本目录不验证断流/取消；这些功能路径已在 M1 配套独立验证。真实模型工具选择、断网、跨平台、插件卸载与学生掌握程度仍未验。二图复用既有导出，GitHub/PDF 视觉验收仍待完成。代码 Apache-2.0，正文/自制图按现行新增图文许可；来源见 [rights/sources.json](../../rights/sources.json)。
