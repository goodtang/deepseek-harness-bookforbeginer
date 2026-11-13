# 第六章作者核验记录

release.json、cancel.json、uncooperative.json、after-result.json 是从本轮真实请求、持久会话和本地测量筛出的教学字段；不是完整 HTTP/会话原件。它们对应 .lab-runtime/current-gate-release、current-gate-cancel、current-uncooperative、current-S3；恢复对应 current-restored。原件不覆盖前章记录。

verification.json 核对五组实际运行、插件改变和精确恢复，并拒绝六项错误证据副本。反例只修改内存副本，不能替代真实运行。回归 S1、S2、S2-exhaust 的新代码证据在 regression.json。代码指纹与输入哈希保留，读者复跑不要求生成相同的随机ID或时间。

uncooperative-plugin-source.txt 是当时关闭监听的完整源码快照，原工作文件位于 .lab-runtime/reader-plugin.mjs；复制回同级目录并另取 .mjs 名字后才作为插件使用。start/plugin.mjs 保留合作版本，不改目标业务函数。

早期探针在增加等待服务关闭标记之前运行，不能满足当前检查器的清理断言；其原件和初版字段摘录本机保留，不作为本轮当前版本通过证据。当前版本检查器先拒绝缺清理标记的旧样本，再以新实测数据验证。

作者核验不是读者签收。图稿GitHub/PDF、外网隔离、新机、其他平台及原偶发超时根因仍按工作包记录，未在此宣布通过。
