# 图稿状态

CH-TOOL-01（插件注册关系）与 CH-TOOL-02（正常工具循环时序）均保存 `.mmd` 图源与同名 PNG。[正文](../chapters/CH-TOOL.md)引用 PNG，避免阅读依赖平台的 Mermaid 在线渲染服务；图源链接用于后续编辑。

本轮已使用 Mermaid 11.17.2、Playwright 1.61.1 和本机 Edge 实际导出并逐图目视检查，中文、文字、箭头和边缘完整。本机原始两段 Mermaid 均可渲染，没有复现语法错误。GitHub 页面浏览器访问超时，不能据此断言平台故障原因或声称托管页面视觉验收通过。PDF 检查仍待完成。版本、尺寸与哈希见[渲染记录](render-record.json)。

重新生成时，需要已有的 Playwright 与 Mermaid 包目录，以及已安装的 Edge。工具不会自动安装依赖，命令中的两个目录可替换为本机实际安装位置：

```powershell
node tools/render_diagrams.mjs D:/projects/deepseek-harness-local/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright D:/projects/deepseek-harness-local/node_modules/.pnpm/mermaid@11.17.2/node_modules/mermaid
```

生成后须逐图检查正文显示、图注与图源一致，再更新来源登记、渲染记录和活动指纹。图片本身按本仓库新增图文许可，渲染脚本为 Apache-2.0；不将渲染依赖库打包进书稿。当前只是两图完成本机导出，不等于 V6 全部图组通过。
