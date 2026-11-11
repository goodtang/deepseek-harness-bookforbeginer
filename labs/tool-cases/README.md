# 第四章逐步接入实验

本目录实现[第四章 4.2](../../chapters/第04章-第一个业务工具.md#42-把查询能力注册成工具)的工作文件、加载准备及正常接入复核。当前只有 start/normal 两种入口；missing、invalid-argument、unregistered 和库存场景尚未实现，不能按实施计划中的命令提前运行。

## 文件和编辑位置

- [start/plugin.mjs](start/plugin.mjs)：导入与依赖已准备好，apply 为空，没有业务工具注册。
- [stages/plugin.mjs](stages/plugin.mjs)：完整注册快照，业务函数复用 first-tool/tickets.mjs，输出约定不变。
- [support.mjs](support.mjs)：从指定源码检出加载 defineTool，避免让读者的业务代码承担源码路径转换。
- [run.mjs](run.mjs)：加载所选插件，经真实 headless profile 驱动模拟请求，检查并保存结果。

读者按正文把起点复制到本目录 `.lab-runtime/my-plugin.mjs`，只在自己的文件中补 apply。已有文件不要覆盖。start、stages 和 .lab-runtime 在同一层级，因此两条相对导入可以原样保留；移动文件需重新核对路径。

运行器参数为 `<源码根目录> <start|normal> <新的证据目录> [插件文件]`。第四项不传时使用本目录起点或完成快照；学生应传自己的工作文件，以免误把参考答案运行成功当作自己的代码完成。精确 PowerShell 命令及根目录填写方法见正文和第二章。

前提为目标源码基线 fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159、跟踪文件干净及已有可用依赖。启动命令使用源码根目录的 tsx/esm，应用仍经支持的 dsh profile 启动。源码改动后应先复核本实验，不静默套用旧结论。

## 起点、完成和独立小改动

start 使用一次模拟回答，只检查应用可以结束且业务工具未公开；它不测试未知工具调用。normal 使用 tool_call_success、success 两次脚本行为，检查工具定义、id 参数、同一调用编号下的工单结果和最终输出。模拟回答不能评价真实模型是否会选对工具。

overlay.yml 保存实际加载配置：关闭自动标题请求，insert 加入插件，name 指向实际工作文件绝对路径。report.json 单独保存插件/支持文件/运行器哈希、源码提交、调用及结果、应用退出状态和清理。新证据目录已存在时拒绝执行，避免覆盖旧记录。

description 小练习只修改说明，然后比较 report.json 的 toolSchema.description；恢复说明后再跑一次。工具名与三个结果字段不应改变。这里准备的是源码学习设施，独立插件包的发布与依赖安装不是本轮验收范围。

## 作者本轮原件

| 实验 | 报告 | 观察结果 |
| --- | --- | --- |
| 空插件起点 | [a-start](evidence/a-start/report.json) | 应用退出 0，工具定义缺席；模拟回答一次 |
| 完整注册 | [a-normal](evidence/a-normal/report.json) | 应用退出 0，两次请求，调用及工单结果关联通过 |
| 只改说明文字 | [a-description](evidence/a-description/report.json) | 说明进入首次请求，查询仍正确 |
| 空插件被当作 normal | [a-negative](evidence/a-negative/report.json) | 预期的校验失败，passed=false；不是本轮未解决的成功路径故障 |
| 原完成版回归 | [a-restored](evidence/a-restored/report.json) | 原说明、原查询约定重新通过 |

另按正文 PowerShell 复制和运行步骤复现了 [a-reader-start](evidence/a-reader-start/report.json) 与 [a-reader-normal](evidence/a-reader-normal/report.json)：完成文件取自正文完整代码块，未用另一份隐藏实现；两次均通过。核对记录为 [a-reader-checks.json](evidence/a-reader-checks.json)。这仍是作者复现，不是学生独立试读。

每个目录的 overlay.yml 与报告对应，例如[完成版实际加载配置](evidence/a-normal/overlay.yml)；其中作者的绝对路径只作实测出处，读者应核对本次运行生成的文件。修改说明实验使用完成快照的副本，只改 description；副本不替换库内完成版。作者检查参考实现可行，不代表学生已经独立完成。

以上仅 Windows x64、Node v24.12.0、本机模拟模型与真实 Harness 的指定场景。清理检查覆盖模拟服务、直接应用子进程、隔离 home/工作目录；证据目录和学生练习文件有意保留。本轮未验证执行计数、非法参数拒绝、真实缺失编号结果、断网、取消、跨平台或库存迁移。现有 first-tool 工程及其旧证据未修改。

本目录可执行代码为本书独立编写的 Apache-2.0 教学设施；正文及自制图遵循现行新增图文许可。来源登记见 [rights/sources.json](../../rights/sources.json)。
