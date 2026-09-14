# @superconnectx/mcp

独立的 SuperConnectX MCP 封装，不依赖 Electron。

宿主只需要实现 `McpFacade`，即可复用同一套工具契约，并选择：

- `startMcpStdio(facade)`：单客户端 STDIO
- `McpLoopbackServer`：127.0.0.1 Streamable HTTP
- `createMcpServer(facade)`：嵌入自有 Transport

桌面客户端、CLI 和测试都应通过 Facade 接入，不能在 Transport 内复制连接业务。
