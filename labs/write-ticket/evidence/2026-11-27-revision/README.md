# 第十章修订：亲手改规则与原始记录自验

源码仍固定fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，Windows/Node24.12.0；上游、共享m1和前章实现未改。本轮给本章运行器增加可选的读者领域模块和empty-title练习，不改Agent循环或确认机制。原[2026-11-26证据](../2026-11-26/README.md)保留当时的文件hash与范围，不改成新版本的通过记录。

[verification.json](verification.json)记录原十三类在当前六个运行文件上的全部复跑。每组重新核对真实Session JSONL与观察事件、callId/确认id/命令摘要、工具值与后续请求、独立GET回执及物理business.json的字节/hash。13类均通过并完成子进程、模型、后台及临时root清理；不是只复用旧报告或stdout。

[practice.json](practice.json)记录五个实际阶段：原domain起点empty-title、完成版allow/empty-title/duplicate、精确恢复原domain后empty-title。起点与恢复组应用退出0、真实工具体完成且关闭1次，但练习验收返回1；排除了启动超时、无调用和异常清理冒充反例。完成后三组通过：正常关闭1次，空标题not-written/TITLE_REQUIRED且关闭0/版本1/无账本，两个新Session重复仍关闭1次。每组保留实际载入的reader-domain.mjs与SHA-256；带空格的自有模块路径实测可用。恢复组hash等于起点，完成三组hash一致，完成版与原版不同。

[trace.json](trace.json)摘录正常组真实tool/call、approval/asked、approval/decided和tool/result，并附独立HTTP回执与实际业务状态。正文四行摘录来自该组，不编造id；mock-call-1跨Session可重复，因此不能把callId字面值当作业务去重键。

[commands.json](commands.json)记录正文十段PowerShell及实验README测试段的字面执行。除填入本机根目录、在明确的编辑步骤插入折叠参考改动和完成回执函数外，未替换命令。实际执行了正常组/原始字段断言、规则起点/完成/恢复、丢回复两组、提交后取消与跨层结果断言、回执起点拒绝/参考完成6项，以及README中完整定义CancelAfterEvidence后的测试。自有规则和备份保留，临时服务与home清理；代码块语法检查不替代这些实跑。作者完成有提示，不能登记为学生独立完成。

[tests.txt](tests.txt)为该字面测试段的22项通过、0skip：8领域、1真实HTTP自定义规则、9取消证据及错误副本、4业务规则证据及错误副本。HTTP规则接入检查先出现预期RED（原后台200而要求409），接入所选规则后GREEN。正文回执起点主动报未完成是预期拒绝，不是环境故障。错误报告副本不计真实业务事故。

[inputs.json](inputs.json)登记当前实验模块hash；commands.json另登记实际执行代码块hash。完整运行原件、命令、提示和凭据只保留本机/脱敏私有归档，公开只选虚构业务字段。原偶发启动问题仍未定位，本轮通过不表示根因已解。

两张既有PNG未改，关系与新练习相容：规则仍在“业务提交或拒绝”中，未引入新的Harness扩展点。读者、GitHub/PDF、新机/其他平台、外网隔离/完整M1和生产身份/并发/崩溃事务均未通过本轮自动验收；章节仍为初稿完成并修订，技术、图稿、连贯性部分通过，读者未检查。
