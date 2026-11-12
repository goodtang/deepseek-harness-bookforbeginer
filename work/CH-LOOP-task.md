# CH-LOOP 工作包：第五章正式初稿

更新日期：2026-11-12。稳定 ID CH-LOOP，正式章号 5，正文[《工具结果怎样进入下一次模型请求》](../chapters/第05章-工具结果怎样进入下一次模型请求.md)。本轮围绕同一结果进入后续请求完成 5.1–5.3，状态为初稿完成，不记定稿。

## 依据与读取范围

用户明确“读者验收可以最后进行，开始第五章编写”，本轮正式开写，不再将 M1-R 设置为第五章起稿前置条件。外网隔离仍按先前明确决定保留待完成；这项执行顺序调整不表示 M1-E/M1-R 或完整 M1 已通过。

读取 CONTRIBUTING、START-HERE、STATE、HANDOFF、CANON、CHAPTERS、执行安排和章节模板；相邻第四章定点读开篇、4.2 注册与既有输出说明、4.4 对照、章末迁移及交接、M1 实验设施与原件。第五章本轮完整阅读并复核；第六章尚无正文，仅保留“等待与取消”交接目标，不假称读取不存在的正文。全篇旧章试读未执行。

## 章间交接

| 字段 | 本章内容 |
| --- | --- |
| 进入状态 | 已学习函数、对象、断言、注册工具及第四章结果/失败对照 |
| 输入产物 | 同一 TK-1042、lookupTicket、book_ticket_lookup、完整 render 与 M1 S1 运行器 |
| 新问题 | 本地函数结果怎样进入后续模型请求，为什么循环继续 |
| 新增知识 | 调用 ID 与业务 ID；value/content；事件日志/surface；内部消息/协议消息；turn/step/请求次数 |
| 暂不展开 | 历史替换、压缩、插件投影、并发调度、详细重试与取消；在对应机制章节回访 |
| 输出产物 | 两请求差异表、真实源码路径、字段转换图、持久/协议结果关联与负例检查 |
| 检查补救 | 对照 ID/content；先排环境与 S1 场景，再按 render→日志/surface→构造请求→序列化定位 |
| 下一章入口 | 同一工具已完成但后续响应未到时，等待与用户取消如何处理；未预造正式第六章 |

## 源码与实验

上游固定 fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，运行器核对跟踪文件干净，本轮不改上游或既有业务实现。结构查询使用 CodeGraph；精读坐标均链接在正文：tools/pipeline.ts dispatchToolBody:258、createSuccessResult:537；tools/batch.ts BatchSettlement.commit:252；session/surface.ts 消息类型集合:50、deriveEventMessage:120；session/index.ts deriveMessages:999；agent-loop/agent.ts step:435、turn:327、buildRequest:656；llm-deepseek/serialize.ts serialize:57。native-tool-executor/src/index.ts 确认选用执行器委托 executeToolBatch。

新增 [inspect.mjs](../labs/next-request/inspect.mjs) 只读取实际原件，不介入模型请求构造；[check.mjs](../labs/next-request/check.mjs) 在内存副本上做反例。真实 S1 复跑采用既有 m1/run.mjs，输出在忽略的 .lab-runtime/S1-20261112，原件保留本机，不把系统提示和全部上下文再次发布。公开[摘录](../labs/next-request/evidence/2026-11-12/excerpt.json)限于字段、事件类型和顺序，并保存完整原件字节哈希；它不是原始完整请求。

作者复跑得到两请求、一次 execute、一个 turn、两个 step，应用退出 0，工具 ID 与三个业务字段匹配，持久 content 与第二请求 content 相等，正常完成及临时 home/目录/模拟服务清理通过。五项反例是删除结果、改错调用 ID、改错请求工单、改错持久结果、失败退出状态，全部拒绝。反例不等于 Harness 故障注入。代码最终字节指纹和结果以[检查证据](../labs/next-request/evidence/2026-11-12/checks-final.json)及 FILES.json 为准，不覆盖此前章节的历史报告。

本例步骤返回 null 是尚未结束回合，不是业务查询返回 null；正文区分了两者。完整 Session 接受事件后异步持久化，导出消息不重读磁盘；工具结果 role=tool 与线上 user/tool_result 由适配器转换；tool/call 不直接作为消息发送，调用块来自 assistant/message。终端答复是预设文字，不当作真实模型语义判断。

## 检查状态与接续

写作：5.1–5.3 初稿完成。技术：通过本章限定正常功能与证据检查范围；新机、其他平台、真实模型和外网隔离未验。图稿：部分通过，自制 CH-LOOP-01 PNG 与图源已导出并目视检查；GitHub 页面/PDF 未验。连贯性：部分通过，作者核对三节递进、第四章出口及后续等待/取消目标；读者连续试读未验。读者：未检查，按用户要求后置，不能代签。

收尾已运行文档工具 12 项通过、许可检查通过；代码与读者练习快照哈希已同实测记录核对。链接/指纹及暂存差异在最终发布前检查，发布结果以 Git 核查。下一步根据阅读反馈修订第五章，或沿此交接进入等待/取消的源码讲解；M1 的隔离、读者及其他未验项目独立保留。运行设施退出并清理，不留自有应用进程。

新增讲解与图为本书独立编排，按当前正文许可；脚本 Apache-2.0。少量源码摘录与行为解释对应 SRC-DSH，保留 MIT 与第三方署名；不复制参考教材图文。素材登记见 rights/sources.json。
