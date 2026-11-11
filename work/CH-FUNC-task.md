# CH-FUNC 工作包：第三章正式初稿

更新日期：2026-11-11。稳定 ID 为 CH-FUNC，正式章号 3，标题《写出并验证工单查询函数》。本轮交付三个连续小节、一个自写函数练习（starter.mjs + check.mjs）、一张实际导出的图，以及"未完成 / 已完成"两次断言实测。写作状态为初稿完成；技术验证仅覆盖本章纯函数断言，读者验收未开始，不标定稿。

## 阅读范围与相邻交接

已读 V6 第一篇条目、CANON、CHAPTERS、CH-OBS/CH-RUN 工作包与正文关键交接，以及生产版 tickets.mjs 与 first-tool 工程。前两章正文已存在，本章复用其记录与运行方法；后章 CH-TOOL 为部分试写，本章只承接其"同一函数与数据"的交接目标，不声称已读不存在的完整后章。

| 交接字段 | 本章内容 |
| --- | --- |
| 进入状态 | 能定位两份仓库、运行观察命令、按退出码与错误定位（第二章成果） |
| 输入产物 | 同一 TK-1042 记录、观察方法与运行方法 |
| 新问题 | 一条工单由哪几个字段组成，怎样按编号查出来，并证明查对了 |
| 新增知识 | 对象与字段、函数与参数/返回值、找到/找不到分支、返回副本、最小断言 |
| 暂不展开 | `Object.hasOwn` 与 `__proto__` 边界在 CH-TOOL；模块、异步与工具 schema 在后续章 |
| 输出产物 | 可运行的 lookupTicket 及三项断言的两次实测 |
| 检查补救 | 断言失败时定位是编号错还是返回原对象，改 starter.mjs 不改 check.mjs |
| 下一章入口 | CH-TOOL 用同一 lookupTicket 与数据接成真实工具 |

## 工程问题与源码映射

本章解决"按编号查工单"这一最小只读能力，对应生产版 [tickets.mjs](../labs/first-tool/tickets.mjs) 的 `lookupTicket`。教学版 starter.mjs 用简单写法（`tickets[id]` + 三元分支 + `{...ticket}` 返回副本），生产版额外用 `Object.freeze` 与 `Object.hasOwn` 处理原型键边界；差异在正文与工作包标注，CH-TOOL 回访。数据仍是 TK-1042/open/Invoice export failed，未另造一套。

本章不启动 Harness 任务，也不改上游源码；check.mjs 是只读断言设施，不新增业务查询实现。

## 实际验证与边界

Windows x64、Node v24.12.0。两次运行：对未完成 starter.mjs 退出 1（找到/副本两项失败、missing 通过）；对生产版 tickets.mjs 退出 0（三项全过）。证据在 [stub-report.json](../labs/func/evidence/2026-11-11/stub-report.json) 与 [answer-report.json](../labs/func/evidence/2026-11-11/answer-report.json)。不涉及真实模型、真实工单、断网、跨平台或读者复现；这些边界未验证。

## 图、文字与权利

CH-FUNC-01 为本书自行绘制的函数分支图，已用本机 Edge 导出 PNG 并目视检查；GitHub 页面/PDF 未验。starter.mjs 与 check.mjs 为 Apache-2.0 教学代码；正文与图按现行新增图文许可。生产版 tickets.mjs 同属教学代码，未复制上游实现。

## 收尾与下一步

三节按"数据 → 函数 → 断言"连续推进，预测、作者实测、学生复现、差异解释齐备；末段交接 CH-TOOL。下一轮进入 CH-TOOL：把 lookupTicket 接成真实工具，并补 `__proto__` 边界与非法参数实验。
