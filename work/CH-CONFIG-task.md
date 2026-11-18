# CH-CONFIG 工作包：第九章应用组合与配置

更新日期：2026-11-18。用户明确开始第九章；9.1–9.3初稿完成并修订。标题《插件怎样组成应用：读懂启动与配置》。技术、图稿、连贯性部分通过；读者未检查。沿用源码fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，不改上游。

| 交接字段 | 本章范围 |
| --- | --- |
| 进入状态 | 理解第八章服务三角色、ctx.plugin与依赖/释放 |
| 输入产物 | 同一TK-1042、消费者、两提供者和真实headless运行器 |
| 新问题 | 插件由谁选择，配置从哪里来，修改为何没有生效 |
| 新增知识 | profile、bundle、patch、组合顺序、id/name/config、静态dump与运行时激活 |
| 暂不展开 | 全量插件树、包发布/安装器、HMR、远程写业务与生产部署 |
| 输出产物 | 9.1–9.3、启动/配置图、正常/修改/恢复及错误配置实测、读者patch练习 |
| 检查补救 | dump只证组合，运行核查真实服务/工具/持久结果，退出码单列 |
| 下一章入口 | 在已会组合与诊断后引入有权限和确认的业务写入；后章尚无正文 |

已读CONTRIBUTING、STATE/HANDOFF/CANON/CHAPTERS、前章工作包/出口、V6应用组合目标。CodeGraph定位runCli→runProfile→composeProfile→readProfilePatches→boot；发现真实顺序包含home层及末尾telemetry策略，不能省略并写成全序。dump不执行!!js，不证明插件可装入。先研究再实测，运行失败保留原件，不将旧章证据改套新代码。

本轮先核实配置，再写相邻三节，收尾通读。读者后置；外网隔离/M1、原启动超时、其他平台及页面/PDF保持待验。完整原始请求只保留本机/私有，公开选字段。

## 首轮交付与检查（保留当时范围）

正文[第九章](../chapters/第09章-插件怎样组成应用，读懂启动与配置.md)、[实验](../labs/profile-config/README.md)、[当前证据](../labs/profile-config/evidence/2026-11-18/README.md)。八类配置场景包括memory/file/restored/reader四正常和typo/missing-path/bad-path/disabled四错误；reader另实际起点/完成/恢复1/0/1，基础S1均true。相同consumer、模型工具定义不变，选择与主工具真实提供者对应，主任务2请求1执行，持久/观察事件/后续请求及清理核查。

真实公开CLI dump八阶段通过，另两项命令拒绝。实测config整对象替换、home层和命令行参数顺序、!!js不求值、坏用户层时default恢复。dump不证明加载；default不接受patch。typo本次运行stderr空但实际memory，dump另提示not found；后三错误应用exit0/业务S1退出1，外层反例验收0。首typo检查误判警告必打印、首default误传patch，失败原件保留，修正预期后在新目录完整复跑。

共享m1/run仅新增S1可选额外参数extraPatch、第二个真正的--patch与输入hash/快照；不传仍原路径。本轮原S1/S2/S2-exhaust/S3实跑通过，旧报告保留旧hash，不写成共享运行器未变。上游tracked树仍净，未修改或重建上游。新增校验器先缺失而失败，再通过真实file报告与六个拒绝副本；连启动诊断3项共10测试，0skip。证据副本不充当运行故障。

读源码路径：runCli bin.ts:32→runProfile profile-boot.ts:271→composeProfile:224→readProfilePatches profile-context.ts:74→boot app-boot/index.ts:1200。loadProfileDirectory profile.ts:678读bundle清单；PROFILE_TEMPLATES bundles.ts:10；实际Include applyPatches vendor/include/src/patch.ts:47逐字段赋值。导出renderConfigDump app-boot/index.ts:631，只组合不执行。vendored Include许可证与已保留Shigma MIT逐字节一致，另登记来源，不用DeepSeek根MIT覆盖。

两图CH-CONFIG-01/02实际导出PNG并本机目视，已缩短首图标签避免不自然换行；源/hash/尺寸进render-record。正文按选择→真实切换→覆盖→错误→独立补丁编排，回访第二章目录、第八章语义/依赖；通读相邻出口与当前三节，下一章暂无正文，只锚定权限/确认/幂等/结果核查，不提前声明写入已实现。

所有自建进程/模拟服务/临时home清理通过，练习文件仍留在明确自有目录。完整dump/报告/失败/请求在忽略.lab-runtime与私有归档，公开只取虚构业务行。Windows现有环境有限通过，技术记部分通过；原偶发启动根因/其他平台/真实业务/HMR未验，图稿页面/PDF未验，连贯性为作者核对、读者未检查。读者后置、隔离/M1待验不推进。下一步为读者反馈或进入可控业务写入；发布与归档以实际Git核对。

收尾检查：正文/实验说明11段PowerShell代码通过语法解析；12项文档工具测试、360活动指纹/本地链接、9来源/291材料许可清单及diff检查通过。语法解析不等于新机运行，文件检查不等于视觉/读者验收。

## 本轮修订实施记录

用户明确要求完善。先将真实无关ENOENT误收写成回归，观察Missing expected exception，再补config-selected/提供者开始/结构化文件错误与目标路径、顺序断言。临时包装提供者在本次apply内创建，沿真实providerCtx调用并重抛原错误，不新增共享状态或长期资源。共享m1只记录实际launch及失败时实际requestBodies；实际复跑、正文和状态结果见下节及收尾证据。


## 2026-11-18 评审修订交付

当前证据[2026-11-18-revision](../labs/profile-config/evidence/2026-11-18-revision/README.md)。真实误收报告先进入失败回归，RED为Missing expected exception；修订后原报告、同故障真实复跑与公开fixture均被拒绝。bad-path绑定实际选择/提供者开始/实际失败code/path及顺序；missing-path绑定配置拒绝；disabled绑定真实补丁与请求无本工具，不用缺日志假证零执行。正常八类配置、字面正文reader命令1/0/1及完成版备份/恢复、八阶段dump与原四场景均复跑通过。20项测试0skip；副本反例与真实故障独立记录。

共享m1仅增加实际子进程launch记录和失败时requestBodies保存；launch.args直接作为spawn参数，不另造解释用参数。原应用行为仍由profile控制，旧证据保持旧hash。正文补完整产品命令表示、两补丁快照/真实argv/home/workspace/模型地址导读，明确清理后不是可直接重放的环境；base/headless六个真实条目连接已学tools/执行器/loop/模型/启动/runner。9.2核心片段标明省略测量包装，实际observedFile仍调用原File.apply。

reader从新起点先拒绝，再编写、独立取字段自断言、保存完成版并恢复拒绝；失败读runtime/report而不是不存在的summary。作者用正文原文生成实际PowerShell并执行，未代学生签收。README按参数名/顺序表达，纠正argv[7]与第六个业务参数的序号混淆。

章内9.1→9.2→9.3与八章出口已复核，十章暂无正文，继续权限/确认/幂等/结果核查目标。原图未改，技术/图稿/连贯性仍部分通过，读者后置未检查，隔离/M1、页面/PDF、其他平台和原启动可靠性不推进。原件、失败回归、脚本变体和实际请求完整保留；发布及归档以收尾核对。

本轮收尾：20项实验/回归/诊断测试0skip、12项文档工具测试、370活动指纹/本地链接、9来源301材料、14段PowerShell语法和diff检查通过。reader三阶段原文命令另实际执行，不把单纯语法解析说成实跑；原两图字节未改。
