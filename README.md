# 从零理解与开发 DeepSeek Harness

面向零基础学习者的中文教材项目：从一次任务和一个查询函数出发，逐步理解插件、工具、Agent 循环、数据、协作与交互，最终能够阅读陌生实现并完成业务二次开发。

**编写说明：现有规划、部分文档与脚本使用生成式工具辅助起草和整理，维护者进行了阶段性评阅；技术核验与读者验收仍按实际记录推进。详见 [编写与核验说明](EDITORIAL.md)。**

**当前阶段：规划及执行资料已归档，E1 样章接入工程尚未开始。** 这里尚无完整书稿、通过验收的教材实验或已完成的学生试读。

## 从哪里开始

| 目的 | 入口 |
| --- | --- |
| 理解学习目标、语言、图解与教学路线 | [V6 编写方案](planning/book-plan-v6.md) |
| 理解执行顺序、资料衔接与验收 | [实施安排](planning/execution-plan.md) |
| 接续实际工作 | [START-HERE](work/START-HERE.md)、[当前进度](work/STATE.md) |
| 编写章节和记录工作 | [章节模板](templates/chapter.md)、[工作包模板](templates/chapter-task.md) |
| 查看历史规划 | [归档说明](archive/README.md) |

## 维护约定

本仓库是教材文件的正式版本维护位置。源码研究基线为 `goodtang/deepseek-harness-local` 的 `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`；上游链接固定到该提交。研究版本升级时需复核正文、图和实验。

每章呈现预测、作者实测、学生复现、差异解释和验证结论。首读者候选为维护者 goodtang，尚未安排实际试读；工程通过与读者通过分别记录，不以规划完成代替教学效果。

日常执行见 [CONTRIBUTING.md](CONTRIBUTING.md)。校验使用 Python 标准库：

```sh
python tools/verify_book.py
```

经审查的文件变更需要更新指纹时运行 `python tools/verify_book.py --refresh`，再检查产生的差异。脚本检查本地 Markdown 链接、编码和文件指纹；不证明外部链接可访问、代码行为正确或读者已经学会。

目录预留为 [chapters](chapters/README.md)、[labs](labs/README.md) 和 [diagrams](diagrams/README.md)。它们目前只有状态说明，尚无已完成内容。

## 版权与开放许可

自行撰写的书稿与自制图表采用 **CC BY 4.0**，自行编写的代码和脚本采用 **Apache-2.0**；第三方资料保留原权利与许可，不纳入上述默认授权。旧版 Apache-2.0 授权不因本次说明自动撤回。详见 [许可范围](LICENSE)、[版权说明](COPYRIGHT.md)、[第三方声明](THIRD_PARTY_NOTICES.md)和[来源登记](rights/README.md)。

发布前同时运行 `python tools/check_licenses.py`。版权审查不能仅靠自动检查；来源或权限不明的材料不进入可发布正文。公开资料不包含私人会话、凭据或未脱敏业务数据，历史版本通过 Git 保留。
