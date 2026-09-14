# @superconnectx/mcp-cli

独立运行的 SuperConnectX MCP CLI，不需要启动桌面客户端。安装后可直接把 `scx-mcp` 配置为 AI 客户端的 MCP STDIO 服务。

```json
{
  "mcpServers": {
    "superconnectx": {
      "command": "scx-mcp",
      "args": ["--stdio", "--mode", "read-write"]
    }
  }
}
```

底层实现由 `@superconnectx/mcp` 提供；CLI 默认使用本机串口运行时，也支持 `--facade` 接入自定义设备后端。
