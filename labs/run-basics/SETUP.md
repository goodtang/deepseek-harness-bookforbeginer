# 第二章配套：准备 Windows 学习环境

这是本书针对 goodtang/deepseek-harness-local 的准备步骤，不是另一套通用框架教程。本轮实测在已有依赖的 Windows x64 环境完成；以下“安装工具→下载→安装依赖→构建”的新机全链路尚未在空白机器重新执行，必须保持待验收。已有两份仓库的读者从版本核对开始，不重复创建同名目录。

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

下面假设你选择 `D:/projects`，且两个目标目录都不存在；没有 D 盘时换成自己的父目录，并修改后续所有对应路径。

```powershell
New-Item -ItemType Directory -Force D:/projects
Set-Location D:/projects
git clone https://github.com/goodtang/deepseek-harness-bookforbeginer.git deepseek-harness-bookforbeginer
git clone https://github.com/goodtang/deepseek-harness-local.git deepseek-harness-local
```

下载可能需要网络访问和相应仓库权限。两条 clone 分别得到书稿和工程，不把目录合在一起。若目录已经存在，就进入并核对它，不删除或覆盖原有工作来获得同名新目录。

在刚下载的源码学习副本中选择本书基线：

```powershell
Set-Location D:/projects/deepseek-harness-local
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
Set-Location D:/projects/deepseek-harness-bookforbeginer
node labs/run-basics/check.mjs D:/projects/deepseek-harness-local
node labs/observe-task/run.mjs D:/projects/deepseek-harness-local
$LASTEXITCODE
```

前一条预检失败时，先处理它指出的定位或依赖问题，再执行观察任务。逐条输入，不要因为把整个代码块粘贴完，就忽略前面某条命令已经失败。

本场景通过模拟服务运行，无需真实模型密钥；安装和下载仍可能需要网络。这两个条件分别记录。若暂时没完成准备，可以回第一章读实测记录，但保持自己的“独立运行”待完成。
