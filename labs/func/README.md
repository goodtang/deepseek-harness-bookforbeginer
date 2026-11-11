# 第三章配套：写出并验证工单查询函数

对应[第三章](../../chapters/第03章-写出并验证工单查询函数.md)。本章编写普通的工单查询函数，为后续通过插件接入 goodtang/deepseek-harness-local 做准备。这里的业务函数与虚构数据由本书编写，不是 Harness 内置工单 API，也不是可直接用于生产系统的实现。

## 读者从哪里开始

- [starter.mjs](starter.mjs)：保留的练习起点，只返回 null。按正文编辑它，不要改配套检查器来迁就结果。
- [completed.mjs](completed.mjs)：本章完成快照，除许可与说明注释外，与 3.2 完整代码一致；遇到困难时用来核对。
- [check.mjs](check.mjs)：三项行为检查，核对已知记录、不存在编号和返回副本。
- [check-one.mjs](check-one.mjs)：3.3 的第一条断言，导入同目录的 starter.mjs；要在补全该函数后运行。

在你自己的书稿根目录执行。每条 node 命令后紧接着查看退出码；代码块使用 PowerShell 语法。

```powershell
node labs/func/check.mjs labs/func/starter.mjs
$LASTEXITCODE
```

未修改的起点应有两项失败，退出 1；按正文补全后应全过，退出 0。然后用 `node labs/func/check-one.mjs` 检查第一条自写断言，修改预期值观察失败，再改回正确值重跑。3.3 解释了导入、断言与输出，也给出后续断言的加入位置。独立扩展写在读者自己的 `my-check.mjs`，运行命令为 `node labs/func/my-check.mjs`。

需要单独核对作者完成快照时，执行 `node labs/func/check.mjs labs/func/completed.mjs`。它验证的才是本章简化实现。后续工具示例的 [tickets.mjs](../first-tool/tickets.mjs) 还增加了 Object.hasOwn 和固定数据冻结；本章不把它当成简化版的替身，也不把那份教学代码称作生产系统。当前完成版不保证正确处理原型属性名或嵌套对象的深层复制，这些不属于本章已验证的查询范围。

## 当前实测与复核方式

当前证据为 [checks.json](evidence/2026-11-11-clarifications/checks.json)，对应补充 const 与查询执行对照后的正文；教学代码和 11 个场景均未改变。作者在 Windows x64、Node v24.12.0 下执行以下复核命令：

```powershell
node labs/func/verify.mjs
```

这是维护者复核命令，要求仓库的 starter.mjs 仍是原始起点；读者完成练习不需要运行它，也不必为复核覆盖自己写好的代码。它在独立临时目录中重建“按正文补完”的文件，不修改仓库里的练习文件，并直接运行 Node 子进程。正文完成代码和第一条断言与对应快照逐段比较，追加断言直接取自正文代码块，不另写一套替代实现。

命令会打印本次证据目录，默认位于忽略的 `.lab-runtime`。维护者可用 `node labs/func/verify.mjs <新的证据目录>` 留档；目录必须尚不存在，以免覆盖旧记录。

| 场景 | 实际结果 | 支持的结论 |
| --- | --- | --- |
| 未完成起点 | 退出 1，找到/副本失败，missing 通过 | 检查能发现函数尚未完成 |
| 本章 completed.mjs | 退出 0，三项通过 | 正文实现满足本章三个行为要求 |
| 漏掉 export | 退出 1，提示没有找到导出的 lookupTicket | 检查文件需要函数导出 |
| 第一条断言 | 退出 0，输出“状态检查通过” | 示例能检查补全后的函数 |
| 故意把预期改成 closed | 退出 1，无成功输出 | 断言能发现实际值与预期不同 |
| 恢复预期为 open | 退出 0，成功输出恢复 | 改正后可复跑通过 |
| 按正文追加完整记录、missing、副本断言 | 退出 0 | 本节新增的断言组合可运行 |
| 故意返回原对象 | 退出 1，副本项失败 | 检查能发现对原记录的误修改 |
| 参考扩展 TK-1043 | 退出 0，核对三个字段和旧工单状态 | 章末扩展有可行的参考实现 |
| 扩展后运行原三项检查 | 退出 0，三项通过 | 新工单没有破坏旧行为 |
| 后续工具示例回归 | 退出 0，三项通过 | 两份教学版本保持本章查询约定 |

记录保存每个场景的命令、预期与实际退出码、实际 stdout/stderr，以及正文、检查器和被检代码的 SHA-256。临时副本清理结果单独记录；证据文件有意保留。子进程报错中的临时路径是作者本次实测位置，不是读者必须创建的目录。

这轮验证没有运行 Harness、调用模型或真实工单系统；没有进行其他操作系统和实际学生试读。参考扩展运行通过不能代替读者独立完成。

## 旧证据的适用范围

[上一轮 11 场景记录](evidence/2026-11-11-revision/checks.json)保留原正文哈希与适用版本，不用新正文覆盖它；本轮重跑记录见上方当前证据。

原始 [stub-report.json](evidence/2026-11-11/stub-report.json) 和 [answer-report.json](evidence/2026-11-11/answer-report.json) 原样保留。后者的实际目标是 first-tool/tickets.mjs，不能据它宣称已验证本章的简化完成快照；当前记录补足了这项对应关系。

本目录教学代码采用 Apache-2.0，正文及自制图按现行新增图文许可；素材来源见 [rights/sources.json](../../rights/sources.json)。
