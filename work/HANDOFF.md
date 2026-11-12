# 接续检查点

日期：2026-11-12。本轮补齐 M1-S1 持久 Session 核对，以及 S2/S3 功能实测；完整 M1 仍未通过。代码与精确命令见 labs/m1/README.md，当前原件 evidence/release；每组采用同一工单工具、支持的 headless profile、独立 home/目录/脚本。

S2：partial_disconnect 后只允许重试一次，实际三请求恢复；连续断流对照在两请求后 error/TRANSPORT、工具 0 次。S3：工具已执行一次、第二请求 stalled 后由外部 HTTP 控制端调用公开 Agent.cancel({kind:user})，收到 accepted，持久 turn/end 为 aborted/user；无第三请求、无重试、未触发超时看门狗。四组的应用退出、功能断言及清理分开记录。

原始 durable-0.jsonl 是真实文件，不是内存快照；与 session/event 逐项比较，并核对调用/结果/三个字段/结束原因。首次观察插件等待未就绪副作用导致启动超时的探针原样保留，不计主动取消成功。当前 verified 原件才适用于最终脚本。

外网隔离预检只做只读盘点：docker/podman/WindowsSandbox 未找到，WSL 未就绪，未建立网络隔离。用户已明确当前没有环境，先保留待完成。不要自行安装或更改全局网络策略；不要将 functionalPassed 当 M1-E 通过。M1-R、图稿发布和其他平台也未验。

第四章仍为初稿完成，增加配套排错表，并修正 4.2 过时的未验证措辞及 4.5 补救入口。原 tool-cases completion 报告保留其代码/正文适用版本，不覆盖历史。新增 JSONL 纳入活动指纹，并有先失败再通过的防篡改回归；全套文档工具 12 项通过。

下一步：根据读者反馈修订初稿；隔离环境可用后先验证真实外网拒绝/回环允许，再复跑四场景并补证据，重新判 M1-E。未完成这项前不宣称完整 M1，不以新增普通功能对照抵扣必测验收。
