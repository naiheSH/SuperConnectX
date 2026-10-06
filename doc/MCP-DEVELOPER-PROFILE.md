# 开发者包

开发者包是一份 JSON 配置。它把设备模板、模板目录和自定义 Facade 组合成自己的设备能力。

复制 `resources/mcp/profiles/generic.developer.json` 到下面任一位置：

- 项目内：`.superconnectx/profile.json`
- 用户目录：`~/.superconnectx/profile.json`

然后运行：

```bash
scx-mcp --doctor
```

`--doctor` 会显示加载了哪个 profile、模板数量和跳过原因。

## 构件
| type | 作用 | path |
| --- | --- | --- |
| `template-dir` | 设备命令和日志事件模板 | 目录 |
| `resource-dir` | 寄存器表、协议说明、标定数据等资料 | 目录 |
| `script-dir` | 开发者自己的辅助脚本 | 目录 |
| `parser` | 自定义日志或协议解析器 | 模块文件，导出 `default(input)` |
| `tool` | 自定义 MCP 工具 | 模块文件，导出 `default(input)` |
| `facade` | 替换默认连接后端 | 模块文件，导出 `McpFacade` |
自定义 Facade 必须导出 `default` 或 `facade`，并实现 `McpFacade`。

模板只声明命令、等待条件和日志事件，不执行 Shell、JavaScript 或网络请求。写命令仍受 MCP 写租约和权限模式约束。
