# 第二章配套：准备 Windows 学习环境

这是本书针对 goodtang/deepseek-harness-local 的准备步骤，不是另一套通用框架教程。本轮实测在已有依赖的 Windows x64 环境完成；以下“安装工具→下载→安装依赖→构建”的新机全链路尚未在空白机器重新执行，必须保持待验收。已有两份仓库的读者先按[正文](../../chapters/CH-RUN.md#21-先知道自己站在哪个目录)填写实际路径变量，再从版本核对开始，不重复创建同名目录。

## 1. 准备命令所需的工具

Git 用来下载和识别源码版本。在 [Git 官方 Windows 安装页](https://git-scm.com/install/windows)取得与你系统架构相符的安装程序，完成安装后重新打开 PowerShell，执行 `git --version`；本书源码开发说明要求至少 2.26。

Node 负责执行本书脚本和目标工程的 JavaScript。到 [Node 官方下载页](https://nodejs.org/en/download)选择 Windows 安装包，版本须满足源码的 >=24.9.0。作者用 v24.12.0 实测，不要求你为模仿作者而安装旧补丁版本；其他版本需按实际运行结果验收。安装完成后重新打开终端，执行 `node --version` 和 `npm --version`。npm 是随常规 Node 安装提供的包管理工具，下面用它安装 Corepack。

先运行 `corepack --version` 看它是否已可用。Corepack 并非所有 Node 版本都会附带，[Node 官方说明](https://nodejs.org/download/release/v25.8.0/docs/api/corepack.html)明确从 Node 25 起不再随运行时分发。若命令不存在，可按 [Corepack 官方安装说明](https://github.com/nodejs/corepack#manual-installs)使用 npm 安装。本轮已有环境使用 Corepack 0.34.5，下面给出相同版本的准备命令：

```powershell
npm install --global corepack@0.34.5
corepack enable
corepack --version
```

第一行把指定版本的 Corepack 安装为命令；第二行为包管理器准备命令入口。已有可用安装时不必重复安装。安装或权限失败时，先保留错误和 `Get-Command node, npm, corepack` 显示的位置，核对实际使用的是哪份工具；本页不把未验证的权限修复写成已经通过的步骤。

## 2. 下载书稿和目标源码

先选一个自己有权限写入的学习父目录。下面的默认例子使用当前用户目录下的 `harness-study`，不要求存在 D 盘；如果这两个仓库已在其他位置，跳过 clone，按正文填写实际路径即可，两份仓库不必放在一起。

```powershell
$StudyRoot = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'harness-study'
New-Item -ItemType Directory -Force -Path $StudyRoot
$BookRoot = Join-Path $StudyRoot 'book'
$HarnessRoot = Join-Path $StudyRoot 'harness'
```

`book` 与 `harness` 是本例的新目录名，不影响仓库内容。先用 `Test-Path -LiteralPath $BookRoot` 与 `Test-Path -LiteralPath $HarnessRoot` 检查；只有两个目标都不存在时才执行：

```powershell
git clone https://github.com/goodtang/deepseek-harness-bookforbeginer.git "$BookRoot"
git clone https://github.com/goodtang/deepseek-harness-local.git "$HarnessRoot"
```

下载可能需要网络访问和相应仓库权限。两条 clone 分别得到书稿和工程，不把目录合在一起。若目录已经存在，就进入并核对它，不删除或覆盖原有工作来获得同名新目录。

在刚下载的源码学习副本中选择本书基线：

```powershell
Set-Location -LiteralPath $HarnessRoot
git switch --detach fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159
git rev-parse HEAD
```

`--detach` 让这个学习副本暂时停在具体提交，不创建开发分支；等到实际修改工程的章节再解释分支。输出应是完整的上述提交号。已有开发目录时先用 `git status --short` 看自己的修改，不对它执行强制重置；需要另一版本时准备独立副本。

## 3. 按工程声明准备依赖与构建

保持在源码根目录。Corepack 会读取这里的 package.json，调用其中指定的 pnpm；首次使用可能需要联网下载该版本。

```powershell
corepack pnpm --version
corepack pnpm install --frozen-lockfile
corepack pnpm run build
```

第一行应得到 11.28.5。不要为了对齐工具官网的最新版而改目标工程的 packageManager。第二行按仓库锁文件准备依赖，`--frozen-lockfile` 要求安装过程不改锁文件；如果锁文件与声明不一致，应核查版本和错误，而不是删锁文件重试。第三行依据[源码运行说明](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/README.md#run-from-source)准备并检查构建产物；命令结束后紧接着查看 `$LASTEXITCODE`。

目标工程也支持原生 Windows 开发，其[开发说明](https://github.com/goodtang/deepseek-harness-local/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/docs/development.md#setup-tutorial)列出运行时与环境要求。如果另用 WSL，源码、依赖和工具链需要在同一个操作系统环境中准备，不能把另一系统安装的依赖当作本系统已验证。本章没有执行 WSL 安装或验收。

本轮作者只核对并运行了现有工具链、入口和观察任务，没有在空白依赖目录重新执行这里的 install/build。安装与构建可能触发本机依赖准备，完整新机验收应保留命令输出和退出码；当前不能把这些步骤直接勾成通过。

## 4. 回到书稿目录做实际检查

```powershell
Set-Location -LiteralPath $BookRoot
node labs/run-basics/check.mjs $HarnessRoot
node labs/observe-task/run.mjs $HarnessRoot
$LASTEXITCODE
```

前一条预检失败时，先处理它指出的定位或依赖问题，再执行观察任务。逐条输入，不要因为把整个代码块粘贴完，就忽略前面某条命令已经失败。

本场景通过模拟服务运行，无需真实模型密钥；安装和下载仍可能需要网络。这两个条件分别记录。若暂时没完成准备，可以回第一章读实测记录，但保持自己的“独立运行”待完成。

## 终端与操作系统差异

本文命令使用 PowerShell：`$BookRoot` 是变量，`Set-Location` 切换目录，`$LASTEXITCODE` 读取上一个程序退出码。Bash/zsh 的变量赋值、`cd` 和 `$?` 写法不同，不能只替换盘符就执行这些代码块。macOS/Linux 或 WSL 读者需要对应的工具安装和命令说明；当前没有完成这些平台的端到端验收，不将 Windows 的测试记为其通过。

已有仓库可以分处不同目录甚至磁盘；正文先收集两处实际根目录，再使用变量，不要求目录同名或相邻。作者证据中的真实磁盘路径是实验出处，不能拿它替换读者的位置。重新打开终端后需要重新填写这两个变量；本章不把它们保存为机器全局设置。
