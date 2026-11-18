# 第八章语义验收与装配/数据变化修订

固定源码fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，Windows/Node24.12.0。原三节保留，补最小完整入口/mount及路径解释，新增真实挂载服务的四行为检查，以及JSON同路径修改、三次新实例读入与恢复。没有修改上游或共享m1。

[verification.json](verification.json)：新版本memory/file/lifecycle/reader四正常profile及原missing-inject/bad-file两真实错误配置。四正常组服务语义检查完整、主工具2请求1执行、正确持久/后续请求、状态/监听/释放与清理通过。lifecycle在内存和file各检查一次，其他各一次。service-check-start/passed之间是直接服务检查，toolProviderQueries只统计其外的主工具查询，不能混算工具次数。

[contract-failures.json](contract-failures.json)：始终首条、直接内部对象、忽略取消三组错误提供者经真实profile分别在未知ID、副本、已取消调用处被拒绝，分别只完成前1/2/3项检查，没有service-check-passed；实际工具执行均0。应用可能仍exit0、模型有固定答复，不能记组合通过。评审中曾真实被接收的旧报告另作为回归输入，当前验收拒绝，不回写历史通过标记。

[variation.json](variation.json)：同一owned tickets.json路径实际baseline→changed→restored。消费者和工具定义不变，工单标题在实际持久结果与第二请求中原/新/原，最终输入字节精确恢复。changed的原S1固定旧期望故意不通过；verify-variation独立读取真实JSONL/观察事件/调用结果ID/协议内容/结束/清理，对新预期核查通过，不改旧报告或共享运行器。准备程序保留各阶段输入和入口快照，数据不读取实际输出倒填预期。

[diagnostics.json](diagnostics.json)：保留首个修订装配器直接调用未inject服务而被框架拒绝的失败，改成声明依赖的短生命周期检查消费者后重新完整运行；另实测标签file但忽略数据改用内存查询的提供者，改变数据场景下在首项被拒绝。完整失败、源码变体与stderr均本机/私有保留，未编辑成通过。

[tests.txt](tests.txt)：17项、0skip；含7解析、原生命周期与新增语义标记拒绝、旧错误实现真实报告回归。错误报告副本与真实错误提供者分开记录。[inputs.json](inputs.json)记录当前代码指纹与消费者hash；strict消费端类型正反例另复核，正确通过、错误Promise<string>触发TS2416，仍仅使用现有vendor声明，不代替上游重建。

本轮所有自有应用/模拟服务/临时根清理核查通过，JSON只改自己的副本，原书稿tickets.json未改。完整提示/请求/JSONL不直接公开。原图未改，图稿本机记录保持，GitHub/PDF、读者、外网隔离/M1、原偶发启动根因及其他平台/生产并发等仍待验，未用本轮通过扩大保证。
