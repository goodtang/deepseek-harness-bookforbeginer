# 图稿状态

CH-TOOL-01（插件注册关系）与 CH-TOOL-02（正常工具循环时序）均保存 `.mmd` 图源与同名 PNG。[正文](../chapters/CH-TOOL.md)引用 PNG，避免阅读依赖平台的 Mermaid 在线渲染服务；图源链接用于后续编辑。

正式第一章新增 CH-OBS-01，展示用户、Harness、模拟模型和查询工具的正常交互；同样采用 PNG 和可编辑图源，已实际导出并目视检查。它只概览本次正常路径，省略启动和内部记录；正文与图注说明外侧教材运行器负责收集证据，不能当作 Harness 新增功能。

第二章 CH-RUN-01 说明工作目录、相对观察脚本和源码参数如何共同定位实际工程，并回到 dsh profile 查询。已导出 PNG 并目视检查，标签采用短语以避免生硬换行；图中省略应用内部独立工作目录，读图范围以正文说明为准。

本轮已使用 Mermaid 11.17.2、Playwright 1.61.1 和本机 Edge 实际导出并逐图目视检查，中文、文字、箭头和边缘完整。本机原始两段 Mermaid 均可渲染，没有复现语法错误。GitHub 页面浏览器访问超时，不能据此断言平台故障原因或声称托管页面视觉验收通过。PDF 检查仍待完成。版本、尺寸与哈希见[渲染记录](render-record.json)。

重新生成时，需要已有的 Playwright 与 Mermaid 包目录，以及已安装的 Edge。工具不会自动安装依赖，命令中的两个目录可替换为本机实际安装位置：

```powershell
node tools/render_diagrams.mjs D:/projects/deepseek-harness-local/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright D:/projects/deepseek-harness-local/node_modules/.pnpm/mermaid@11.17.2/node_modules/mermaid
```

生成后须逐图检查正文显示、图注与图源一致，再更新来源登记、渲染记录和活动指纹。图片本身按本仓库新增图文许可，渲染脚本为 Apache-2.0；不将渲染依赖库打包进书稿。本机导出不等于 V6 全部图组通过。

生成第一章图时，在上述命令后追加 `CH-OBS-01`，第二章图则追加 `CH-RUN-01`；不传图 ID 时仍只生成既有 CH-TOOL 两图。四图的本机导出不等于 GitHub 页面、PDF 或 V6 全部图组验收通过。
