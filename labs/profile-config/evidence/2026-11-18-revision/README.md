# 第九章评审修订：失败原因、实际启动与练习顺序

源码fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159不变，Windows/Node24.12.0。当前修订不改上游或第八章提供者/消费者；包装对象在本次apply内创建，沿真实providerCtx调用原File.apply并重抛原错误，没有新增长期资源或模块共享可变状态。

[failures.json](failures.json)：记录曾被误收的真实无关设置文件ENOENT（原报告不改），当前检查器拒绝；同一故障经新版外层完整复跑，退出1且无成功summary。bad-path现在要求入口选择file/本次路径、提供者开始同一路径、实际错误ENOENT/实际failedPath相同且顺序成立。missing-path在配置阶段明确拒绝，不能靠缺日志假定到达了读取。disabled另核对真实禁用补丁和实际请求没有本工具定义，而不是把缺日志直接等同零执行。

新增公开fixtures/unrelated-file.mjs供读者得到自己的真实反例原件；实际m1运行并由同一检查器拒绝。它与历史私有变体语义相同，不改报告。公开fixture测试另在本机保留；历史原误收报告进入20项中的回归测试。

[verification.json](verification.json)：八类配置场景重新实跑，正常memory/file/restored/reader保持原工具定义和同一consumer，两请求一次执行、四服务行为、持久/观察/后续请求与清理通过。literal reader sequence直接执行正文提取的PowerShell命令，起点/完成/恢复1/0/1，三次基础S1均通过；完成版先存独立副本，恢复输入与memory原字节一致。不记读者独立完成。

[launch-map.json](launch-map.json)：从真正传给子进程的argv验证CLI入口、headless、两个补丁顺序、独立home/workspace与回环模型地址；公开只展示角色与快照hash，实际路径在本机runtime/launch.json。正文可读回完整记录，但临时环境已经清理，补丁副本不能作为仍可直接重放的环境。

[regression.json](regression.json)：m1增加实际launch与失败时requestBodies留档后，原S1/S2/S2-exhaust/S3重新通过。八阶段dump与两类拒绝也重新实跑，原件revision-layers-20261118；dump脚本未改，原规则不变。旧证据按原版本保留，不回写其代码hash。

[tests.txt](tests.txt)：配置正向7、错误路径阶段9、原真实误收回归1、启动诊断3，共20项、0skip。新增回归先实际出现Missing expected exception，再修复通过。错误证据副本与实际反例分别记录；公开fixture另真实复跑/测试通过。[inputs.json](inputs.json)固定当前代码、未改consumer和新增导读涉及的base/headless原配置hash。

原两图未改，保留原本机目视记录，不虚报重新验过页面/PDF。读者、外网隔离/M1、新机/其他平台、原启动根因、HMR/生产继续待验。完整成功/失败/请求/dump/PowerShell原件保留忽略目录与私有归档，公开无系统提示全文。自有子进程、模型服务、临时home/root清理核验通过，自有练习与完成版备份保留供编辑。
