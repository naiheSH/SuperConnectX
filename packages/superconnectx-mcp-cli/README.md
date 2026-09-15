# @superconnectx/mcp-cli

独立运行的 SuperConnectX MCP CLI，不需要启动桌面客户端。安装后可直接把 `scx-mcp` 配置为 AI 客户端的 MCP STDIO 服务。

```json
{
  "mcpServers": {
    "superconnectx": {
      "command": "scx-mcp",
      "args": ["--stdio"]
    }
  }
}
```

底层实现由 `@superconnectx/mcp` 提供；CLI 默认使用本机串口运行时，也支持 `--facade` 接入自定义设备后端。

CLI 默认开放完整操作能力；如需限制，请显式传入 `--mode read-only` 或 `--mode read-write`。

## 接入 AI 客户端

先确认 CLI 能看到设备：

```bash
scx-mcp --doctor
```

生成 MCP 配置：

```bash
scx-mcp --print-config
```

将输出的 `mcpServers.superconnectx` 合并到 AI 客户端配置。Claude Desktop、Cursor、Codex 等支持标准 MCP STDIO 配置。

Skill 安装后，在 AI 对话中使用 `$superconnectx-mcp`；Skill 只负责工具路由和安全说明，真正的连接由 `scx-mcp` 提供。

HTTP 模式客户端配置：

```json
{
  "mcpServers": {
    "superconnectx": {
      "url": "http://127.0.0.1:32180/mcp",
      "headers": { "Authorization": "Bearer CHANGE_ME" }
    }
  }
}
```
