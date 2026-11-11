# 第二章配套：路径、预检与实际运行

读者路径以正文填写的 `$BookRoot` 和 `$HarnessRoot` 为准，不要求作者的磁盘、目录名或相邻布局。新增 [reader-paths.json](evidence/2026-11-11-revision/reader-paths.json) 记录 Windows pwsh 中跨 C/D 路径根、中文、空格和不同层级别名的实际预检/查询；[验证脚本](reader-paths.mjs) 只解除自建 junction，不删除目标。它使用既有准备好的仓库，不代表物理迁移、新机安装或其他平台验证。

对应[第二章](../../chapters/第02章-第一次自己运行.md)。源码基线为 fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159，本轮为 Windows x64、Node v24.12.0、Git 2.50.1.windows.1，源码目录中 Corepack 0.34.5 / pnpm 11.28.5 已可用。新机准备见 [SETUP](SETUP.md)，其完整安装与构建链路未重新验收。

实际工具版本命令输出见 [toolchain.txt](evidence/2026-11-11/toolchain.txt)，版本声明与实际工具输出分开留存。

[check.mjs](check.mjs) 只读检查源码名称、提交、Node 版本、入口和 tsx 解析，不执行安装，不检查全部依赖，也不冒充完整构建。它输出的 pnpm 值来自声明；实际版本另在源码目录用 Corepack 检查。运行方法见正文。

作者使用 [verify.mjs](verify.mjs) 产生如下当前证据；默认写入独立的忽略目录，可选第二个参数另存。作者运行命令为 `node labs/run-basics/verify.mjs D:/projects/deepseek-harness-local <证据输出目录>`，末项实际目录请替换，不把尖括号占位符作为命令的一部分。

| 场景 | 本轮结果 | 证据 |
| --- | --- | --- |
| 书稿目录相对脚本预检 | 退出 0 | [预检原文](evidence/2026-11-11-revision/preflight-stdout.txt) |
| 源码目录使用同一相对脚本路径 | 退出 1，包含 MODULE_NOT_FOUND | [checks.json](evidence/2026-11-11-revision/checks.json) |
| 不存在的源码参数 | 退出 1，提示 package.json 定位错误 | 同上 |
| 源码目录使用绝对预检脚本 | 退出 0，输出与正常预检一致 | 同上 |
| 书稿目录使用相对观察脚本 | 退出 0，真实工具结果与 stdout 检查通过 | [原始运行报告](evidence/2026-11-11-revision/relative-observation-from-book.json) |
| 源码目录使用绝对观察脚本 | 退出 0，同一查询结果 | [原始运行报告](evidence/2026-11-11-revision/absolute-observation-from-source.json) |

两次观察分别启动自己的模拟服务与实际 headless profile，各自两次模型请求。内部复用既有 first-tool 与 observe-task 代码，未创建另一套查询实现。报告记录工具结果、终端 stdout、退出、资源清理和源码哈希。验证器保留自己的忽略目录作为本地取证材料；应用运行器创建的临时 home、工作目录与 mock 已清理，不能把二者混为一项删除结果。

checks.json 的失败项保存退出码和经过断言核对的诊断摘要，不是完整错误堆栈。实验只改变调用者工作目录与传入路径，不测试业务参数非法、模型故障、取消或新机器安装。错误码中的路径会随本机变化，不能用作者完整磁盘路径判断成败。

图 CH-RUN-01 使用原始 .mmd 导出 PNG 并本机检查；GitHub 页面及 PDF 视觉验收尚未完成。代码为本书独立编写的 Apache-2.0 教学设施，真实工程源码保留原许可。环境步骤链接官方工具资料，不打包第三方安装程序或复制其整篇说明。

本轮教学优化补采了[错误工作目录的完整 stderr](evidence/2026-11-11-revision/wrong-workdir-stderr.txt)、[错误源码参数的完整 stderr](evidence/2026-11-11-revision/wrong-source-stderr.txt)及[两份目录下的实际 Test-Path 结果](evidence/2026-11-11-revision/path-checks.json)。前两项是子进程输出原文，后一项是执行后记录的布尔结果，不冒充实时日志。六场景重新运行，新材料放入独立 revision 目录；原 2026-11-11 目录及实际工具版本记录保留原件。

原始 stderr 按捕获字节保存，Git 对这两类日志禁用自动换行转换；Windows CRLF 属于原件内容，不用手工换行来匹配正文。
