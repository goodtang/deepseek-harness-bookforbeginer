# 第三章配套：写出并验证工单查询函数

对应[第三章](../../chapters/第03章-写出并验证工单查询函数.md)。本章练习不依赖模型、不依赖真实工具管线：读者按正文把 `starter.mjs` 补成按编号查找的函数，再用只读断言 `check.mjs` 核对。生产版本见 [tickets.mjs](../first-tool/tickets.mjs)，是下一章工具接入复用的同一函数；本章先掌握数据、函数、分支与最小断言，不重复生产版对 `__proto__` 等边界的处理。

## 运行方式

在书稿目录执行（第二个参数是要检查的文件路径，可换成你自己写的文件）：

```powershell
node labs/func/check.mjs labs/func/starter.mjs
node labs/func/check.mjs labs/first-tool/tickets.mjs
```

第一条对未完成的 `starter.mjs`（只返回 `null`）应当退出 `1`，反映“还没写完”；第二条对生产版 `tickets.mjs` 应当退出 `0`，三项断言全部通过。三项断言是：查 `TK-1042` 得到 `open` 记录、查不存在的编号得到 `null`、改动返回结果不影响原记录。

## 证据

作者在 Windows x64、Node v24.12.0 上运行两次，输出保存于 [evidence/2026-11-11](evidence/2026-11-11/stub-report.json) 目录：

| 场景 | 目标文件 | 退出码 | 三项断言 | 记录 |
| --- | --- | --- | --- | --- |
| 未完成 | starter.mjs | 1 | 找到/副本失败，missing 通过 | [stub-report.json](evidence/2026-11-11/stub-report.json) |
| 已完成（生产版） | first-tool/tickets.mjs | 0 | 全部通过 | [answer-report.json](evidence/2026-11-11/answer-report.json) |

两次运行共用同一 `check.mjs`，只换被检查的文件；没有修改断言去迁就结果。`check.mjs` 与 `starter.mjs` 为本书独立编写的 Apache-2.0 教学设施；生产版 `tickets.mjs` 同属教学代码。本章未运行 Harness 任务，也不声称读者已通过练习。
