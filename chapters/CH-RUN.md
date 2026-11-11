# 第二章 第一次自己运行

第一章里，我们沿着记录查到了 TK-1042，也知道了“查询已完成”与“工单已经关闭”是两回事。现在，我们把这次查询在自己的电脑上启动起来。

你可能已经打开了终端，却不知道应该在哪个目录输入命令。也可能照抄了一整行，屏幕只返回“找不到模块”。这时候，先别改查询代码。程序还没有开始查工单，问题可能出在它连脚本文件都没有找到。

这一章围绕同一份 DeepSeek Harness 工程，完成三件事：找到文件，核对运行环境，执行并检查结果。示例使用 Windows 的 PowerShell；作者本轮在 Windows x64 验证，其他平台和从空白机器开始的完整安装另列待验，不把已有环境的成功扩大解释。

## 2.1 先知道自己站在哪个目录

先把两份文件分清。

```text
D:/projects/
  deepseek-harness-bookforbeginer/    书稿仓库
    chapters/                       章节正文
    labs/                           教学脚本与实验
  deepseek-harness-local/            目标工程源码仓库
    package.json                    工程及依赖的声明
    packages/                       工程各项能力的实现
    apps/cli/                       命令行入口
```

书稿仓库提供阅读材料和教学实验；源码仓库提供我们正在研究的真实 Harness。以后要读插件、任务循环和数据实现，主要进入后者。现在的教学脚本也会使用后者的代码与依赖。

`D:/projects` 是作者的示例位置，不是程序要求的盘符。你可以放在别处，但命令中的路径要随之改变。如果还没有下载这两份仓库，先完成本书的[环境准备说明](../labs/run-basics/SETUP.md)，再回来。

在 PowerShell 中输入：

```powershell
Get-Location
```

终端会告诉你当前目录。这个目录也叫工作目录：程序遇到没有写全的文件位置时，通常就从这里开始查找。接下来，我们把它切换到书稿仓库：

```powershell
Set-Location D:/projects/deepseek-harness-bookforbeginer
Test-Path .\labs\observe-task\run.mjs
```

第一行改变当前位置。第二行检查这个位置下面是否有观察脚本，预期返回 `True`；如果返回 `False`，先核对目录和文件位置。`Test-Path` 只检查路径是否存在，不会运行查询。

`.\labs\observe-task\run.mjs` 是相对路径，开头的点表示当前目录。同一个相对路径，换个工作目录就可能指向别处。`D:/projects/deepseek-harness-local` 则是绝对路径，从盘符开始交代位置。Windows 的这些示例中，斜杠两种写法均可用于这里的路径；有空格的整段路径需要放进双引号。

先预测：如果你进入源码仓库，再原样输入下面这条命令，能找到本书的预检脚本吗？

```powershell
node labs/run-basics/check.mjs D:/projects/deepseek-harness-local
```

找不到。`labs/run-basics/check.mjs` 在书稿仓库中，Node 却会从当前的源码目录寻找它。作者实测该操作退出码为 `1`，错误中包含 `MODULE_NOT_FOUND`。最后一项虽然写对了源码位置，却不能替前面的脚本补上书稿路径。

把工作目录切回书稿仓库，就修正了这个定位问题。另一种方法是写全脚本的绝对路径；我们在 2.3 节再试。

## 2.2 核对环境，再启动同一张工单的查询

刚才命令开头的 `node` 是什么？它负责运行 JavaScript 程序；本书的 `.mjs` 文件是这种程序的一种模块文件。Node 能执行脚本，并不表示脚本需要的其他代码已经准备好。

那些由工程使用、需要另行安装的代码叫依赖。目标仓库用 `package.json` 声明工程信息和依赖要求，用 pnpm 管理依赖；Corepack 帮我们调用工程指定的 pnpm 版本。Git 则负责取得源码并识别版本。它们各有用途，不能只看“电脑上装过一个开发工具”就认为环境齐全。

本书源码基线的要求来自[根 package.json](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/package.json)和[开发说明](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/docs/development.md#prerequisites)：

| 项目 | 此基线的要求或声明 | 作者本轮实际环境 |
| --- | --- | --- |
| Node | 至少 24.9.0 | v24.12.0 |
| pnpm | packageManager 指定 11.28.5 | 在源码目录检查为 11.28.5 |
| Git | 至少 2.26 | 2.50.1.windows.1 |
| Corepack | 用于调用项目 pnpm；本表不自定最低版本 | 0.34.5 |

本章没有要求你特意安装作者的旧补丁版本。重点是满足源码要求，并核对依赖实际使用的版本；新安装与构建步骤见[准备说明](../labs/run-basics/SETUP.md)。已经有源码和依赖的读者，也要检查自己用的是书中基线。

回到书稿目录，运行本章提供的只读预检：

```powershell
Set-Location D:/projects/deepseek-harness-bookforbeginer
node labs/run-basics/check.mjs D:/projects/deepseek-harness-local
```

它检查目标目录的工程名称、源码提交、Node 版本、命令行入口和一项启动依赖。作者实测输出节选为：

```text
Node：v24.12.0（满足 >=24.9.0）
目标工程：@deepseek-ai/dsh-root
源码提交：fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159
pnpm 声明：pnpm@11.28.5（声明值，不是安装检查）
tsx 启动依赖：可解析
```

`tsx` 是这里从源码启动时使用的依赖名称，本章先用它判断一项启动条件是否具备，不进入其内部实现。完整[预检输出](../labs/run-basics/evidence/2026-11-11/preflight-stdout.txt)还特意提醒：预检通过并不证明全部依赖、构建和任务都能运行。接下来才执行第一章的查询。

```powershell
node labs/observe-task/run.mjs D:/projects/deepseek-harness-local
$LASTEXITCODE
```

第一行分成三部分读：`node` 运行程序；`labs/observe-task/run.mjs` 指定书稿中的观察脚本；最后的源码目录作为参数，告诉脚本到哪里使用目标工程。第二行读取刚才那个程序的退出码，要在命令结束后紧接着查看。

![书稿工作目录定位观察脚本，源码参数定位目标工程，再由 profile 执行查询并保存证据](../diagrams/CH-RUN-01.png)

图 CH-RUN-01：本图说明这条教学命令怎样定位文件，图源见[可编辑文件](../diagrams/CH-RUN-01.mmd)。相对脚本路径受当前目录影响，源码参数负责另一份目录的定位。实际 Harness 应用仍通过 dsh 的 headless profile 启动；这里的 profile 是预先准备的插件组合。教学脚本还会创建独立的应用工作目录和 home，本图省略这些内部步骤，不能把源码参数当成所有进程的工作目录。

你看到的观察输出应当与第一章相同，其中包含：

```text
以下为 headless 标准输出原文：
Ticket lookup completed.
```

最后还会打印本次证据目录。在默认运行方式下，它位于书稿的 `labs/observe-task/.lab-runtime`。这个目录里的文件是你这次运行产生的材料；正文链接到的 `evidence` 目录保存的是作者某一次实测原件，两者不能混作一次运行。

## 2.3 看懂结束，也看懂失败

命令执行时，电脑中有正在运行的程序实例，也就是进程。正常任务结束后，终端重新接受命令。作者本轮的观察命令退出码是 `0`，证据中的工具结果仍是 TK-1042、open；模拟服务、直接子进程和应用临时目录的清理也分别检查通过。

因此，本次通过有两层依据：程序正常结束，以及实际行为满足了预期。预检脚本就算退出 `0`，也不能代替第二层的工单查询检查。

现在试一个明确会失败的输入。仍在书稿目录，将源码参数暂时写成一个不存在的位置：

```powershell
node labs/run-basics/check.mjs D:/not-a-harness-source
$LASTEXITCODE
```

前提是这个示例位置确实不存在。作者用自己创建的测试目录下一个不存在的位置实测，预检失败，退出码为 `1`，显示：

```text
预检失败：找不到源码目录下的 package.json；请检查路径，勿把书稿目录当作源码目录。
```

与 2.1 节对比一下：那一次是 Node 找不到**要执行的脚本**；这一次脚本已经执行，发现**源码参数指向的目录有问题**。两次都失败，应该修改的位置却不同。排错时先分清失败发生在哪一步，往往比反复粘贴同一条命令更有用。

下面是本轮实测对照。先遮住作者结果一列，逐项作出预测，再阅读和运行。原件和范围说明见[本章实验](../labs/run-basics/README.md)，读者的实际结果仍由自己填写。

| 操作 | 运行前先预测 | 作者本轮实测 | 你的结果 |
| --- | --- | --- | --- |
| 在书稿目录运行相对路径预检 | 应检查到哪份工程 | 退出 0，识别目标仓库与基线 | 待复现 |
| 在源码目录运行同一个相对脚本路径 | 找脚本还是找源码时失败 | 退出 1，MODULE_NOT_FOUND | 待复现 |
| 给预检一个不存在的源码目录 | 脚本能否开始执行 | 脚本执行后报 package.json 定位错误，退出 1 | 待复现 |
| 在书稿目录执行观察任务 | 看哪些材料才算通过 | 退出 0，两次请求、工具结果和清理检查通过 | 待复现 |
| 从源码目录使用绝对脚本路径执行相同观察任务 | 能否找到书稿脚本 | 退出 0，查询结果相同 | 待复现 |

最后一行对应的命令如下。运行前，先自己说明为什么它能找到文件，再试一次：

```powershell
Set-Location D:/projects/deepseek-harness-local
node D:/projects/deepseek-harness-bookforbeginer/labs/observe-task/run.mjs D:/projects/deepseek-harness-local
$LASTEXITCODE
```

你已经不依赖“终端刚好开在正确目录”来解释这次运行。接着，请自己完成两个小检查：写出本机实际的两份仓库位置；在本次结果中找到工单状态和最终终端答复，说明它们是否表达同一件事。

<details>
<summary>完成后再核对</summary>

相对脚本路径从当前目录查找；脚本改为绝对路径后，可以从另一个工作目录定位它。本例仍需正确的源码参数和可用依赖，绝对路径本身不能替代环境准备。工单结果中的 open 表示本次查询返回“尚未关闭”；终端的完成答复表示这次程序输出了完成文字，两者需要分别核对。

</details>

本轮实测使用已有依赖的 Windows x64 环境，没有从空白机器重新安装、构建，也没有验证断网和其他操作系统。实测成功留下的应用临时目录已清理；用于对照的证据文件有意保留。没有完成新机准备或独立运行的读者，应保留相应待完成项。

这一章结束时，你应当能说清命令中的脚本与源码参数各指向哪里，找到自己本次生成的证据，并判断一次路径错误发生在哪一层。下一章，我们终于要改动实际负责查询的那段代码：仍然使用 TK-1042，先从编号、状态和标题这几个数据开始，逐步写出自己的查询函数。这里用过的工作目录、运行和结果检查方法会继续沿用。
