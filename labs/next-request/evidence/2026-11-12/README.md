# 第五章作者核对原件说明

excerpt.json 是本轮新 S1 运行的教学字段摘录，不含完整请求提示或完整会话；输入指纹指向本机 .lab-runtime/S1-20261112 中的完整 report.json 与 durable-0.jsonl。新运行不覆盖第四章或 M1 原始证据。

当前五项反例的代码指纹与结果见 checks-final.json。checks.json 是本轮较早核对版本，当时尚未调整检查脚本在被复制改名后记录自身哈希的方式，保留其适用版本，不把它当作最终脚本的指纹。

reader-exercise.json 是作者完成第六项反例的核对，不是读者验收。reader-exercise-source.txt 保存当时执行的完整脚本字节，原名 reader-check-author.mjs；它与 check.mjs 的区别仅为在 cases 增加错误持久调用 ID 一项。重放时把这份文本复制到 next-request 目录中另取 .mjs 文件名，保留同目录 inspect.mjs 导入，传入自己复跑的 S1 目录及新的输出文件。原输出文件名和临时脚本名不属于业务行为。

时间、会话 ID 和原件哈希只适用于作者本次运行；读者不应手改新证据去追求相同字节。网络隔离、真实模型语义表现及读者独立完成均未在这些记录中通过。
