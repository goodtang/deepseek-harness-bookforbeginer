# 第十章实际写入、确认与结果核查

源码fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，Windows/Node24.12.0；13类最终实现实跑，无真实key。业务为新建自有目录中的虚构工单和回环HTTP服务，不接实际业务账号。上游、共享m1及前章业务实现不改。

[verification.json](verification.json)为13类选定记录：allow、read-only、reject、unavailable、never、server-denied、stale、wrong-call、duplicate、lost-after、lost-before、cancel-before、cancel-after。全部原件来自final-*目录，运行时六个代码文件hash与当前实现逐一匹配；每phase真正的Session JSONL与观察事件重新逐项比较，最终业务文件实际字节/hash及内容再次核对，不以stdout或内存期望代替。

每个调用关联真实callId、approval asked/decided id和明确命令摘要；正常工具值还与下一次实际模型请求的tool_result比较。前置拒绝与业务服务拒绝分开，业务not-written可为isError=false。错callId控制请求409、确认后实际版本推进冲突、后台权限再次拒绝均实测。

duplicate和lost-after各两个新Session，operationId固定相同，最后关闭次数1、账本1，第二次deduplicated。lost-after第一工具unknown而实际GET/文件为committed；lost-before首次unknown、GET未找到，核查仍unknown，不把实验知道的open冒充调用方确定未写。cancel-before在真实待确认问题处取消，工具体0；cancel-after在后台实际提交且保持回复时取消，tool/body1且任务aborted/user，独立回执仍确认提交。

[tests.txt](tests.txt)为8项领域规则加9项实际证据/错误副本检查，17pass/0skip。曾增加一个错误目标回执的检查，先观察committed误判为unknown期望的RED，再收紧目标/版本/状态/操作编号检查；最终全部通过。副本反例不计真实故障场景。[reader.json](reader.json)为正文参考完成版6项检查；未完成起点与只看state的错误实现均拒绝，不代读者独立完成。[inputs.json](inputs.json)保存当前代码hash与范围。

首轮看门狗到期是失败，未确认根因，原件保留；首轮相对证据路径解析问题已修正且只移动自建原件回书稿忽略目录，未改上游tracked文件。另一次未声明工具output schema导致entry未激活，虽headless退出0仍被验收拒绝；补明确schema后重新运行。首次资料没有新版诊断所需全部阶段字段，不反推它是哪一步卡住。后来通过不声明原偶发启动根因已解决。

两图实际导出并本机检查，图2中“调用与核查方”是简化业务角色，实际POST由工具发出、GET由独立driver发出。单用户/单待确认实验，不是生产UI；快照单进程同步提交，不验证fsync、后台重启加载、多实例事务。每组从新数据开始，后台状态文件用于核查，不是生产数据库。

所有最终报告确认应用/模型/业务服务器关闭和临时root清理。学习者自己的模块按明确路径保留。完整请求/提示、原件、控制测试凭据只本机/脱敏私有归档，公开选虚构业务字段。读者、GitHub/PDF、新机/其他平台、外网隔离/M1、原启动根因、真实鉴权及生产范围保持未验，技术/图稿/连贯性部分通过。
