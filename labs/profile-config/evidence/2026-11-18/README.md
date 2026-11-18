# 第九章配置组合实测

源码fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，Windows/Node24.12.0。真实dsh CLI/headless，无真实模型key；没有OS外网阻断。共享m1仅新增S1可选额外补丁，默认路径另回归。

[verification.json](verification.json)：memory/file/restored/reader四正常及typo/missing-path/bad-path/disabled四类配置场景。四正常组收到的source与实际提供者对应，前置服务四行为通过，主工具两请求一次执行，工具定义相同，实际持久/观察事件和后续请求核验通过。恢复补丁与起点字节相同，消费者文件未改。

同文件readerSequence另外保存起点/完成/恢复三次真实运行，练习验收1/0/1、基础S1均true。读者必须自己编写，不用作者完成版签收。typo的S1仍true、实际memory且stderr空，要求file被拒绝；后三错误实际工具执行0，本轮应用仍exit0而S1退出1。外层反例检查确认预期行为后exit0，三个退出码不混淆。完整失败报告保留，不回写成通过。

[layers.json](layers.json)：8个成功dump阶段：默认、profile、home、第一个命令行覆盖、第二个覆盖、未知id、未执行表达式、坏用户层时默认恢复。另有default加patch与坏用户有效dump两项真实拒绝。覆盖核对整个config替换，非深层合并。完整导出在本机，公开只摘虚构业务行，模块地址显示书稿相对路径；dumpSha256对应未改的原始文件。

[regression.json](regression.json)：新增额外参数后原S1/S2/S2-exhaust/S3实跑通过，未传额外参数；自然断流/上限耗尽/公开主动取消与清理仍核验。旧章原报告保留其旧运行器指纹，不伪称本轮生成。

[tests.txt](tests.txt)：7项配置证据检查与3项启动诊断测试，共10项，0skip；六个错误副本只测试检查器，另与真实错误配置分开。检查器新增前执行失败，再有真实file报告后通过。[inputs.json](inputs.json)记录当前脚本与未改消费者hash。源码未改，不声称上游重建。

首个typo核查错误地要求运行时打印警告；首轮default对照错误地同时传--patch，CLI明确拒绝。两失败原件及工具输出保留，核对真实规则后重新运行完整对照，不把失败抹去。所有自建应用/模型服务/临时home退出清理核查通过，练习文件保留供编辑。

两张图已实际导出PNG并本机检查，源码/尺寸/hash在diagrams/render-record.json。读者、GitHub/PDF、外网隔离/M1、新机/其他平台、原偶发启动超时与HMR/生产配置发布均未验，不由本轮普通运行推出通过。
