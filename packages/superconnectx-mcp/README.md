# @superconnectx/mcp

独立的 SuperConnectX MCP 封装，不依赖 Electron。工具名称和 MCP 协议字段保留英文，以兼容 Claude、Codex、Cursor 等 MCP 客户端；说明、错误信息和 Skill 文档提供中文。

宿主只需要实现 `McpFacade`，即可复用同一套工具契约，并选择：

- `startMcpStdio(facade)`：单客户端 STDIO
- `McpLoopbackServer`：127.0.0.1 Streamable HTTP
- `createMcpServer(facade)`：嵌入自有 Transport

桌面客户端、CLI 和测试都应通过 Facade 接入，不能在 Transport 内复制连接业务。

## 安装

```bash
npm install @superconnectx/mcp
```

## 接入方式

宿主只需要实现 `McpFacade`，即可复用同一套工具契约：

```ts
import { createMcpServer, McpLoopbackServer, startMcpStdio } from '@superconnectx/mcp'

// 单客户端：标准输入输出
await startMcpStdio(facade)

// 多客户端：仅监听本机回环地址
const server = new McpLoopbackServer(facade, process.env.SCX_MCP_TOKEN)
await server.start(32180)
```

## 安全约束

- HTTP 只应绑定 `127.0.0.1`，并使用 Bearer Token。
- 读取日志、会话和模板默认是只读操作。
- 写命令必须先获取会话级短时写租约。
- 停止会话、上传文件等破坏性操作必须由调用方显式确认。
- 模板是声明式 JSON，不能执行 Shell、JavaScript 或任意网络请求。

## 工具命名说明

以下名称是协议 API，不翻译：`serial_list_ports`、`session_list`、`log_tail`、`template_list`、`session_send`。用户界面、Skill 和诊断报告使用中文解释这些工具的用途。
