# 接续检查点

日期：2026-11-10。

书稿已迁入独立仓库 goodtang/deepseek-harness-bookforbeginer。后续从 work/START-HERE.md 读取，当前依据为 planning/book-plan-v6.md 和 planning/execution-plan.md；archive 仅为历史。

本次工作完成资料迁移、实施规则修订与文档工具，未开始 E1。首读者候选为 goodtang，尚未确认时间或试读结果。每轮围绕连贯目标可推进 1–3 相邻小节，收尾做章内与相邻段落复核。

下一任务：为 CH-TOOL 建立实际工作包，读取 CH-FUNC 的交接目标和 CH-LOOP 大纲，核实真实工具注册、profile、模型模拟和查询数据。前后章正文尚不存在，不声称已完整读取。

E1 完成需要正常工具循环经真实管线、独立断言、隔离 home、清理及可解释请求。断流与主动取消留在 E2。额外请求的归属仍待原始请求和会话材料确认。

推送前执行 python tools/verify_book.py、python -m unittest discover -s tools -p test_verify_book.py 和 git diff --cached --check。提交和远端核对结果由 Git 记录与本次交付说明确认；未经证据不能将待验证更新为通过。

版权规则已分为基线之后新增且有权授权的正文/自制图 CC BY-NC-SA 4.0、代码 Apache-2.0、第三方按原许可；历史 Apache-2.0 与 CC BY 4.0 授权保留。新增许可文本、来源登记、第三方署名与编写方式说明，后续按 rights/README.md 审查素材。正文与实验验收仍未完成，不将版权文档更新视为教材实测通过。

新旧许可分界以 rights/prior-publication.json 及其基线 Git 版本为准。新限制只适用于新增且有权授权的表达；既有宽松许可、第三方权利、法定例外和代码许可不受追溯限制。
