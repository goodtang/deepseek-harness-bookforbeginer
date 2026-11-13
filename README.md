# 从零理解与开发 DeepSeek Harness

本书以 [goodtang/deepseek-harness-local](https://github.com/goodtang/deepseek-harness-local) 这个具体工程为学习与开发对象。面向零基础学习者，从一次任务和一个查询函数出发，逐步读懂该工程的插件、工具、Agent 循环、数据、协作与交互实现，最终具备源码分析和业务二次开发能力。

**编写说明：现有规划、部分文档与脚本使用生成式工具辅助起草和整理，维护者进行了阶段性评阅；技术核验与读者验收仍按实际记录推进。详见 [编写与核验说明](EDITORIAL.md)。**

**当前阶段：前六章正式初稿已写出，尚未定稿。** 第六章沿同一工单演示可控制等待、取消与收尾，配源码、图和真实修改/恢复实验；读者验收按维护者要求后置。S1/S2/S3 功能实测已完成，外网隔离、新机及适用的页面/PDF 检查仍待验，完整 M1 不记通过。

## 从哪里开始

| 目的 | 入口 |
| --- | --- |
| 从第一章开始阅读 | [一句请求发出去以后](chapters/第01章-一句请求发出去以后.md)、[配套观察记录](labs/observe-task/README.md) |
| 运行同一任务并学习路径、环境与排错 | [第二章：第一次自己运行](chapters/第02章-第一次自己运行.md)、[环境准备](labs/run-basics/SETUP.md) |
| 阅读首次正文试写与复现正常工具循环（试写，建议按主线顺序阅读） | [第一个业务工具](chapters/试写-第一个业务工具（章号待定）.md)、[实验工程](labs/first-tool/README.md) |
| 从工具接入继续读到消息组装 | [第四章：第一个业务工具](chapters/第04章-第一个业务工具.md)、[第五章：工具结果怎样进入下一次模型请求](chapters/第05章-工具结果怎样进入下一次模型请求.md) |
| 理解等待、取消与收尾 | [第六章：查询还在等待，怎样正确取消](chapters/第06章-查询还在等待，怎样正确取消.md)、[实验](labs/wait-cancel/README.md) |
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

正文、实验与图稿状态分别见 [chapters](chapters/README.md)、[labs](labs/README.md) 和 [diagrams](diagrams/README.md)。第一、二章各一图及 CH-TOOL 两图均有 PNG 和可编辑 Mermaid 源图，本机显示已检查；GitHub 页面及 PDF 视觉验收单独记录。

## 版权与开放许可

后续新增且有权授权的书稿与自制图表采用 **CC BY-NC-SA 4.0**，要求署名、非商业使用和相同方式共享；自行编写代码与脚本仍为 **Apache-2.0**。第三方资料按原许可。已按 Apache-2.0 或 CC BY 4.0 发布的内容保留原授权，不受追溯限制。新旧内容的分界见 [既有发布记录](rights/prior-publication.json)，涉及额外商业授权见 [商业使用说明](COMMERCIAL.md)。详见 [许可范围](LICENSE)、[版权说明](COPYRIGHT.md)、[第三方声明](THIRD_PARTY_NOTICES.md)和[来源登记](rights/README.md)。

发布前同时运行 `python tools/check_licenses.py`。版权审查不能仅靠自动检查；来源或权限不明的材料不进入可发布正文。公开资料不包含私人会话、凭据或未脱敏业务数据，历史版本通过 Git 保留。
