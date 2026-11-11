# 接续检查点

本轮完成第四章实施计划工作包 A 的作者交付，正文 4.2 已改成亲手接入步骤。当前正式正文仍为 chapters/第04章-第一个业务工具.md；整章“正式初稿中”，技术/图稿/连贯部分通过，读者未检查。

新增 labs/tool-cases/start/plugin.mjs、stages/plugin.mjs、support.mjs、run.mjs、README 和 evidence。读者复制起点到同层级 .lab-runtime/my-plugin.mjs，只补 apply；运行入口实际加载指定文件，保存实际 overlay，使用真实 headless profile 注册与执行。原 first-tool、第三章代码和上游均未改。

实际验证：起点正常结束且工具缺席；完成版真实查询通过；修改说明进入首次工具定义；空插件冒充 normal 时检查器退出 1、应用退出 0；原完成版恢复通过。五个场景均清理通过。函数版本/副本/freeze 检查及正文完整代码与完成快照一致性通过。证据在 labs/tool-cases/evidence/a-checks.json、a-functions.json 和各场景目录；负例 passed=false 是预期拒绝，不计为成功路径故障。

下一轮执行工作包 B：先读第三章出口、第四章全文、当前计划/工作包、tool-cases 原件，展示实际工具定义、调用及结果的小片段，带学生核对调用编号和字段，再给独立证据判断题。A 的作者交付不代表学生独立完成，不能代填试读。

run 当前只支持 start/normal；start 不发工具调用，不能当作未知工具调用实验。错误参数/执行计数、真实 missing、未注册强行调用、库存迁移、断流/取消/注销、跨平台、页面/PDF 和实际读者验收仍待完成。二图沿用既有导出，本轮未改变图像。未运行上游全量测试或改变模型可见产品协议。

提交前发现早期两份 JSON 的本地 CRLF 与已发布 Git 对象 LF 不同。已先保留本地原件到私有归档，再将工作副本对齐原 Git 对象并刷新指纹；未改旧报告的已发布内容或历史提交。
