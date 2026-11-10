# 接续检查点

日期：2026-11-10。

正式第 1 章 CH-OBS《一句请求发出去以后》三个小节的初稿完成，读者未验收，尚未定稿。当前入口为 [第一章全文](../chapters/CH-OBS.md)、[工作包](CH-OBS-task.md)、[观察工程](../labs/observe-task/README.md)、[章节索引](CHAPTERS.md)。下次先读这些原件，不仅凭本摘要续写。

本轮观察层复用未修改的 first-tool 工程，通过真实 headless profile 和工具管线执行。两次请求均完成，工具结果进入后续请求，退出及临时 home/工作目录/服务清理通过。摘要在结束后从证据生成，不是实时日志或模型自述；观察脚本与底层证据哈希关联。错误源码目录探针不会复用旧成功输出。证据目录刻意保留，没有本轮仍在运行的实验进程。

第一章图 CH-OBS-01 已实际导出 PNG 并目视检查；正文引用静态图片，保留 .mmd 源文件。GitHub 页面和 PDF 视觉验收仍待完成，不重做或声称解决此前在线 Mermaid 平台故障根因。

下一正式任务：CH-RUN《第一次自己运行》，预排第 2 章，正文尚不存在。按 V6 第一篇承接第一章观察记录，解释文件、路径、工作目录、命令、进程、最小环境与错误定位，再逐步进入 CH-FUNC。原粗粒度索引遗漏了运行基础，本轮已补 CH-RUN，不直接从观察跳到函数。第一章不要求预先有开发环境，亲自运行是已有环境下的可选路径；阅读记录和独立复现分开记。

CH-FUNC、CH-LOOP 未写，CH-TOOL 仍只有三个小节试写，未获得正式章号；其非法参数、断流和取消任务继续保留，后续单独推进。第一章完成初稿不表示 M1、连续三章或任何读者验收通过。

下一轮先读第一章全文、观察脚本、证据，再按其输出建立 CH-RUN 工作包；读 CH-FUNC 的交接目标，但不假称已读不存在的后章。固定案例为 lookupTicket / book_ticket_lookup / TK-1042 / open / Invoice export failed，精确配置见现有实验说明。

每轮收尾更新 CHAPTERS 的小节进度、技术/图稿/连贯性/读者状态、版本、证据、日期和下一步。检查 python tools/verify_book.py、python tools/check_licenses.py、python -m unittest discover -s tools -p test_*.py 及 git diff --cached --check。审查差异后才刷新 FILES.json，提交和远端结果依据实际 Git 核查。

版权范围及历史授权以 LICENSE、COPYRIGHT.md 和 rights 为准；公开仓库不存私人会话、凭据或未脱敏业务数据。新图文及独立代码已登记，第三方源码保留 MIT 原许可，不改写历史授权。
