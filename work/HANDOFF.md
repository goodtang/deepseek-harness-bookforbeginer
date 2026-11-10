# 接续检查点

日期：2026-11-10。

书稿已迁入独立仓库 goodtang/deepseek-harness-bookforbeginer。后续从 work/START-HERE.md 读取，当前依据为 planning/book-plan-v6.md 和 planning/execution-plan.md；archive 仅为历史。

本轮完成 E1 正常工具循环工程，以及 CH-TOOL 三个相邻小节试写。先读[工作包](CH-TOOL-task.md)、[正文](../chapters/CH-TOOL.md)、[实验说明](../labs/first-tool/README.md)和[最终证据](../labs/first-tool/evidence/normal-20261110.json)，不要再从旧 artifacts 副本起步。首读者候选为 goodtang，尚无试读结果。

下一任务：补真实非法参数拒绝实验并展开 CH-TOOL 第二节的对应解释；先保持现有正常场景通过，再单独选择断流或主动取消。CH-FUNC、CH-LOOP 正文仍不存在，须按已记录交接目标推进，不宣称读过三章原文。

图稿补修：用户反馈 GitHub 提示 Unable to render rich display。本机 Mermaid 11.17.2 对原两段语法均渲染成功，未定位平台报错根因；访问 GitHub 页面超时。正文现引用 PNG，源文件移至 diagrams，两图已经实际导出并目视检查，后续按 diagrams/README.md 再生成。GitHub 页面与 PDF 仍独立待验收，不再把图源存在当显示通过。

工程固定名称 lookupTicket / book_ticket_lookup / TK-1042，定义见 CANON 和源码。正常场景明确关闭自动标题生成，共两次请求，第二次带有精确匹配的工具结果。退出 0 与行为断言分开，隔离 home/工作目录已删除，模拟服务关闭，直接子进程退出，无本轮待运行进程。E1 通过不等于完整 M1；断流、主动取消、断网复跑、图的渲染/PDF 和读者验收仍待完成。此前外部探针的额外请求归属未复现，不作确定判断。

推送前执行 python tools/verify_book.py、python tools/check_licenses.py、python -m unittest discover -s tools -p test_*.py 和 git diff --cached --check。变更已审核后才 refresh 指纹。提交和远端核对结果由 Git 记录与交付说明确认，未经证据不能更新为通过。后续复现默认输出在忽略目录，不覆盖 evidence 下的发布记录。

版权规则已分为基线之后新增且有权授权的正文/自制图 CC BY-NC-SA 4.0、代码 Apache-2.0、第三方按原许可；历史 Apache-2.0 与 CC BY 4.0 授权保留。新增许可文本、来源登记、第三方署名与编写方式说明，后续按 rights/README.md 审查素材。正文与实验验收仍未完成，不将版权文档更新视为教材实测通过。

新旧许可分界以 rights/prior-publication.json 及其基线 Git 版本为准。新限制只适用于新增且有权授权的表达；既有宽松许可、第三方权利、法定例外和代码许可不受追溯限制。
