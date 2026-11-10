# 从零理解与开发 DeepSeek Harness

面向零基础学习者的中文教材项目：从一次任务和一个查询函数出发，逐步理解插件、工具、Agent 循环、数据、协作与交互，最终能够阅读陌生实现并完成业务二次开发。

**当前阶段：规划及执行资料已归档，E1 样章接入工程尚未开始。** 这里尚无完整书稿、通过验收的教材实验或已完成的学生试读。

## 从哪里开始

| 目的 | 入口 |
| --- | --- |
| 理解学习目标、语言、图解与教学路线 | [V6 编写方案](planning/book-plan-v6.md) |
| 理解执行顺序、上下文与验收 | [实施安排](planning/execution-plan.md) |
| 接续实际工作 | [START-HERE](work/START-HERE.md)、[当前进度](work/STATE.md) |
| 编写章节和记录工作 | [章节模板](templates/chapter.md)、[工作包模板](templates/chapter-task.md) |
| 查看历史规划 | [归档说明](archive/README.md) |

## 维护约定

本仓库是教材文件的正式版本维护位置。源码研究基线为 `goodtang/deepseek-harness-local` 的 `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`；上游链接固定到该提交。研究版本升级时需复核正文、图和实验。

每章呈现预测、作者实测、学生复现、差异解释和验证结论。首读者候选为项目用户 goodtang，尚未安排实际试读；工程通过与读者通过分别记录，不以规划完成代替教学效果。

日常执行见 [AGENTS.md](AGENTS.md)。校验使用 Python 标准库：

```sh
python tools/verify_book.py
```

经审查的文件变更需要更新指纹时运行 `python tools/verify_book.py --refresh`，再检查产生的差异。脚本检查本地 Markdown 链接、编码、文件指纹及导入归档完整性；不证明外部链接可访问、代码行为正确或读者已经学会。

目录预留为 [chapters](chapters/README.md)、[labs](labs/README.md) 和 [diagrams](diagrams/README.md)。它们目前只有状态说明，尚无已完成内容。

保留仓库原有 [Apache-2.0 许可证](LICENSE)。公开资料不包含个人会话、凭据和未脱敏业务数据；历史来源及迁移变换见 [导入清单](archive/IMPORT.json)。
