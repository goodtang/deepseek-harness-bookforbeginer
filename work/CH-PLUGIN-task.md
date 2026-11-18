# CH-PLUGIN 工作包：第八章服务与能力替换

更新日期：2026-11-18。用户明确开始第八章。标题《换一个数据来源，为什么工具不用重写》。写作：初稿完成并修订（8.1–8.3）；技术/图稿/连贯性：部分通过；读者：未检查。源基线fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，不改上游。

按V6 P7及已确认起稿方向，沿用TK-1042/open/Invoice export failed、lookupTicket、book_ticket_lookup。新增bookTickets是本书业务扩展，不声称上游已有工单服务。只读两个提供者、同一工具消费者、真实依赖缺失/卸载/重新激活与读者填写第三提供者；在空闲阶段替换，不声称运行中远程请求自动排空或完整HMR已验。

| 交接字段 | 本章目标 |
| --- | --- |
| 进入状态 | 能追踪工具、请求、取消、持久与续接；理解插件基本接入 |
| 输入产物 | 原查询函数/数据/工具、headless真实profile、持久核对设施 |
| 新问题 | 数据来源换了，为什么不必修改模型的工具调用与消费者 |
| 新增知识 | Context、Service定义/提供/消费、inject与PENDING、效果归属、卸载后重新激活 |
| 暂不展开 | 全部事件模式、配置树/打包详解、远程写入、并发热替换、任意数据库实现 |
| 输出产物 | 两提供者对照、同消费者、源码与图、依赖卸载/注册/监听核验、读者实现练习 |
| 检查补救 | 按服务/工具/监听实际状态断言，不以同一回答或exit0判定替换成功 |
| 下一章入口 | 从手工组合回到profile/bundle/patch与配置诊断，后章暂无正文 |

已读入口、当前STATE/HANDOFF/CANON/CHAPTERS、第七章出口及V6 P7。已读Cordis服务/生命周期教程、vendored Service/Context/Fiber实现及ToolsService.register；CodeGraph未检出vendored主体符号，按精确文件补读，不借fixture伪代框架实现。生命周期审查按所属ctx效果及依赖卸载完成顺序，模型实测复用m1设施，无真实key。

读者后置；原启动超时、外网隔离/M1、GitHub/PDF与新机等状态独立。新正文/示例/图自制，vendored Cordis引用另保留其Shigma MIT许可，不用仓库根DeepSeek MIT替代。

## 实际交付与验收

正文[第八章](../chapters/第08章-换一个数据来源，为什么工具不用重写.md)、[实验](../labs/plugin-services/README.md)、[证据](../labs/plugin-services/evidence/2026-11-18/README.md)。定义TicketSource/Context类型、MemoryTickets复用原函数、FileTickets加载时JSON验证，consumer只有一个文件，通过ctx.bookTickets调用；四正常组合模型可见工具定义完全相同。第三提供者由实际填写reader模板完成，准备脚本仅处理路径/复制配置，不填实现。

复用原m1 S1可选插件入口，未改共享运行器。最终memory/file/lifecycle/reader四组真实profile均2请求/1执行、原工单字段、持久结果和后续请求关联正确；两错误配置分别验证缺inject时无服务提前ACTIVE、坏JSON不提供服务。它们本轮都警告entry未激活、应用仍exit0，但功能验收拒绝，不编造错误必exit1/零模型请求。程序退出、模型服务关闭、临时根删除均核查。

生命周期在主任务前空闲检查点执行：PENDING/无服务/无工具 → ACTIVE/有服务/有工具 → await provider.dispose后PENDING/无工具 → 装file后同fiber ACTIVE。旧/新apply有各自owner，只有新owner收到turn/end；消费者停止先于相应提供者释放。没有持久文件句柄/连接池，不声称在途工作自动排空或完整HMR。Context/inject/Service注册及ToolsService.register效果均接回目标源码。

7个文件解析测试与7个真实生命周期证据/六反例测试共14pass、0skip。错误副本不假称真实工程故障。definition/runtime严格消费端类型检查通过，Promise<string>错误提供者被TS2416拒绝；使用现有vendor构建声明并记哈希，不代替上游源码重新构建或所有JS静态检查。首个普通配置ESM导入失败虽exit0/模型请求2次仍拒绝，原件保留，修正书稿本目录ESM与外部源码导入适配后完整重跑；首次源程序类型检查失败包含书稿const enum对象用法与vendor选项差异，书稿用法修正、原输出保留，最终检查面严格说明，不修改vendor或放宽strict。

来源定位：Cordis Service constructor vendor/cordis/src/service.ts:42→ReflectService.provide reflect.ts:291；Fiber._getState fiber.ts:580、_unload:712（等待dependents后释放effects）；ToolsService.register packages/core/tools/src/index.ts:128。上游真实三角色回访SessionPersistence:144、JsonlSessionPersistence:291、agent-loop.resumeWith:761。CodeGraph用于Harness符号；vendored主体未被索引时按精确文件补读，没有用fixture冒充框架。

两图CH-PLUGIN-01/02的PNG已实际渲染并目视，中文、箭头、状态、边距无裁切；源码/哈希/尺寸登记。新增vendor Cordis独立MIT原文及SRC-CORDIS，不用DeepSeek根MIT覆盖Shigma署名。正文及自制图/代码按书稿原规则登记，完整提示和本机代码变体不公开。

连续复读8.1–8.3并核对七章出口：同工具不同来源→三角色/最少TS语法→依赖/注册/监听卸载→学生完成实现→反例自验。必要前置包括class/new/super/abstract/interface、声明合并、Context、fiber与Agent区别、await稳定不等于就绪；不把工具名/服务名/插件名/类型名混用。下一章暂无正文，按V6应用组合与配置目标交接。

当前限定功能通过，但技术状态部分通过：既有偶发启动根因、新机/其他平台、真实远端业务、并发替换/连接排空等未验。图稿本机部分通过，GitHub/PDF未验；连贯性为作者核对部分通过，学生未验。读者后置、外网隔离/M1和其他待验不推进。自有实验进程/临时根已清理，原件仍在忽略目录；提交、推送与私有增量归档以实际Git核查为准。

## 本轮修订范围

用户明确按评审完善。补真实挂载服务的未知ID/取消/副本语义检查，拒绝原先被接收的错误实现；补最小ctx.plugin装配和路径解释；JSON副本按同路径改变/新实例读取/恢复，并独立核对变更结果。原三节、原工单、共享m1及上游保持原范围，旧证据不回填新结论。

## 2026-11-18 评审不足补齐

按用户明确要求，原三节新增：file-entry完整入口与mount完整函数、两个ctx.plugin/句柄与config.path/file URL解释；真实bookTickets语义检查；JSON变化与恢复。服务约定进一步写明fresh mutable copy和已取消时传播signal.reason。普通组合创建声明bookTickets依赖的检查消费者，通过真实实例验证已知/未知/修改副本后重查/已取消拒绝；检查插件结束后await dispose。装配器本身只inject tools，首个修订直接访问bookTickets被框架拒绝，原失败保留并修正调用归属后完整重跑。

新四正常组合和旧两错误配置重跑；三组真实错误实现分别缺编号匹配、副本、取消，在相应阶段拒绝，原评审曾误收的历史报告也被新检查拒绝。主工具仍2请求1执行，服务前置检查调用用start/passed显式分段，不能混为模型工具执行。生命周期先后检查Memory/File两实例，旧监听和工具撤销/重新激活核对保持。

owned JSON同一路径实际原→变更标题→原字节，每次新headless装入读取；结果及第二请求原/新/原，消费者字节与工具定义不变。changed被旧S1固定原期望拒绝，新verify-variation独立核查真实JSONL/观察事件/工具关联/请求/结束与清理通过，没有篡改报告或共享m1。另有标签file但忽略JSON的实际反例，被变更标题首项检查拒绝。

17项检查无跳过，strict消费端类型正反例复核通过；当前证据evidence/2026-11-18-revision，旧证据按旧代码和范围保留。新增源文件/正文/权利登记/指纹在提交前核查。原两图无修改，新增表和源码讲解，页面/PDF不自动验收。复读8.1变化证据→8.2装配与行为约定→8.3卸载与学生实现，核对七章出口与后续配置目标。技术/图稿/连贯性仍部分通过，读者未检查，原启动/隔离/M1等不关闭。自有进程与临时根清理，数据原件恢复，完整原件本机与私有归档保留。
