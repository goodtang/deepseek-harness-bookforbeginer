# CH-WRITE 工作包：第十章可控工单写入

更新日期：2026-11-26。用户明确继续第十章。10.1–10.3初稿完成；技术/图稿/连贯性部分通过，读者后置未检查。源码固定fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，上游不改。

| 交接字段 | 本章范围 |
| --- | --- |
| 进入状态 | 会读第九章真实启动和配置，能接入只读业务能力 |
| 输入产物 | 同一TK-1042/open/Invoice export failed、真实headless/工具/持久核对 |
| 新问题 | 把工单关闭时，谁授权、确认哪一次、重发会不会写两次、取消/断连后怎样核查 |
| 新增知识 | 权限与确认分开、真实approval seam、固定操作对象与版本、业务幂等账本、未知结果与独立查询 |
| 暂不展开 | 真实租户登录、生产数据库事务/多实例/部署、GUI确认界面、全部团队协作 |
| 输出产物 | 10.1–10.3、两张图、真实工具写入与拒绝/丢回复/取消/重发实验、读者核查练习 |
| 检查补救 | 日志/回复不代替外部业务状态；权限最终由业务服务检查；确认不自动提供幂等 |
| 下一章入口 | 将这套受控能力接到外部使用入口，后章尚无正文 |

依V6 P8：业务写入由教学业务服务/插件明确实现，不说Harness自带工单事务或自动去重。CodeGraph已核实ToolExecutionPipeline.prepare:190、serviceAsk:432和ApprovalService.request:242/decide:293：ask进入真实approval，never先拒绝，无answerer为unavailable，取消问题不撤销外部副作用。工具参数已deep-frozen，确认用callId和明确命令绑定，不声称可以直接改冻结参数。

设计采用本机HTTP业务模拟服务、独立原子JSON快照（业务状态与operation账本同一提交）和真实headless。单进程同步提交用于隔离实验，不声称磁盘fsync/崩溃恢复/多实例事务已验。身份来自受控配置和服务端测试令牌，不从模型参数读取。程序化answerer只用于虚构实验，不代用户真实签收或生产授权。

每次新home/工作目录/端口，控制按实际待确认或业务已提交状态触发。预计正常/只读/拒绝/无answerer/never/后端拒绝/版本变化/错callId/重复/提交后丢回复/提交前丢回复/确认时取消/提交后取消；以实际运行结果收尾，不预勾通过。读者/隔离M1/页面PDF/原启动问题等保持独立。


## 实际交付

[正文](../chapters/第10章-从查询到关闭，怎样控制一次业务修改.md)、[实验](../labs/write-ticket/README.md)、[选定证据](../labs/write-ticket/evidence/2026-11-26/README.md)。新工具book_ticket_close与同一TK-1042，增加业务version=1；模型参数仅id/expectedVersion/operationId，身份来自受控配置，后端再次检查。ToolExecutionPipeline.prepare→serviceAsk→ApprovalService.request/decide为真实路径，不自调用execute冒充集成。scope单用户/单待确认，答复器为虚构实验替身，不代用户真实授权。

十三类最终实现实跑：allow/read-only/reject/unavailable/never/server-denied/stale/wrong-call/duplicate/lost-after/lost-before/cancel-before/cancel-after。duplicate/lost-after各两Session，原操作键跨Session保留、关闭一次，第二次deduplicated；lost-before回执缺失保持unknown，cancel-after任务aborted/user但物理业务文件/HTTP回执已提交。逐项核对callId、approval请求id、完整命令摘要、持久/观察事件、后续请求、外部回执和真实业务文件；不是只信summary布尔值。

运行原件final-*保存六运行模块hash，发布选定前全部与当前字节对照；实际Session JSONL与观察事件重新全量比较，后台原business.json字节/hash/状态与账本独立核对。最终所有子进程/模型/业务服务退出，临时root清除；reader自有模块保留。无真实key/回环不等于已阻外网，M1与读者后置条件不推进。

17项测试（8领域+9真实证据/错误副本）0skip；回执仅看committed的错误判断先出现RED，再收紧目标/操作编号/状态/版本。正文参考完成版6项检查通过，未完成和忽略目标的错误版均拒绝，错误副本不计真实服务故障。两图实际渲染并目视，图1缩短标签、图2明确外部核查角色，最终hash/尺寸登记；页面/PDF未验。

首次原型看门狗到期保留失败，不能确认根因。第一轮相对输出路径跟随源码cwd落错目录，已只移动自建原件回书稿忽略目录并修正入口提前resolve；上游tracked未变。一次缺output schema导致entry不激活但应用exit0，验收拒绝；显式补schema后重跑。旧失败不改成功，新诊断按阶段保留，不用后来通过推断原启动根因。

生命周期：plans/pending/control server均属于本次apply，ctx.on/工具注册为效果，tools/result移除当前plan，关闭时撤回待回答、移除signal监听、清plans并await server.close；业务server由driver拥有并关闭连接后await close，子进程kill后await close，不丢后台工作。只做虚构提交，不试图在退出时回滚已提交业务状态。

已通读九章出口、十章三节与实际代码；新增业务版本/四类ID/HTTP/三态结果逐步解释，ask与never语义说明，不把授权/确认/幂等混同。业务JSON只演示单进程同快照提交，每case初始化，不声称fsync、重启加载、多实例事务或真实租户登录。十一章暂无正文，只按外部使用入口目标交接。初稿完成不等于定稿，原启动问题/新机/其他平台等未验范围仍独立。

收尾检查：17项领域/证据测试0skip、读者参考6项、12项文档工具测试、393活动指纹/本地链接、9来源323材料、9段PowerShell语法及diff检查通过。十三类最终报告的代码hash、实际Session/观察事件及物理业务文件另独立复核。语法/作者核查不代读者、页面/PDF或新机验收。
