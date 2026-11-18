# 第八章服务替换实测

固定源码fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159、Windows/Node24.12.0，沿用虚构TK-1042。四组正常真实profile：memory-final、file-final、lifecycle、reader-final；另两组真实错误配置missing-inject/bad-file，公开字段见[verification](verification.json)。源码与配置未修改上游。

四正常组均真实模型调用→原工具注册/管线→bookTickets，2请求/1执行，持久结果及第二请求工单字段正确，模型可见工具定义完全一致。内存/JSON/读者提供者来源分别核验；共用consumer.mjs没有按来源分叉。lifecycle先PENDING无服务/工具，装内存后ACTIVE，await卸载后PENDING无服务/工具，装JSON后同一fiber重新ACTIVE。两轮consumer标记各自释放，只有新owner观察到最终turn/end，消费者停止先于对应提供者释放。

两错误组都被最终业务验收拒绝，但本轮应用退出码均0、模拟模型各2请求。missing-inject在无服务时提前ACTIVE/工具提前注册，组合断言报错；bad-file验证失败，没有provider-loaded或provider-query。两者都有entry未激活警告；不能把固定答复/exit0写成组合健康，也不能编造“它们必然exit1”。

[tests.txt](tests.txt) 为7个JSON解析测试和7个真实生命周期证据/六错误副本测试：14pass、0skip。反例包括来源未换、旧工具残留、消费者未暂停、旧监听仍收到事件、提供者过早释放、清理缺失；不将副本改动说成真实工程故障。输入代码/读者完成模块/类型声明文件哈希在[inputs](inputs.json)。

严格消费端类型检查接受definition.ts/runtime.ts，拒绝Promise<string>错误提供者（TS2416）；使用现有vendor构建声明，不等于上游重新构建或所有JS静态检查。[diagnostics](diagnostics.json)保留首个ESM/依赖定位失败：应用虽退出0且模型回答，业务未通过；之后源码适配及本目录ESM明确后重新实测。首次源程序类型检查的失败记录也保留，未放宽strict、未修改vendor，最终改用声明文件消费端检查并明确范围。

PNG两张本机目视，页面/PDF未验。所有自有模型服务、子进程与临时home/工作目录清理通过，完整原件/提示/源码变体/早期失败只在本机忽略目录与私有归档。只在空闲检查点替换，不声称运行中排空连接、完整HMR、真实远端数据、外网隔离/M1、新机/其他平台或读者验收通过。既有偶发启动问题根因未定位。
