# @superconnectx/mcp

独立的 SuperConnectX MCP 封装，不依赖 Electron。工具名称和 MCP 协议字段保留英文，以兼容 Claude、Codex、Cursor 等 MCP 客户端；说明、错误信息和 Skill 文档提供中文。

CLI 可以直接访问本机串口，不需要打开 SuperConnectX；也可以通过 `--facade` 接入其它设备后端。Skill/MCP 配置在桌面端时需要客户端运行，而独立 CLI 不依赖桌面端。

宿主只需要实现 `McpFacade`，即可复用同一套工具契约，并选择：

- `startMcpStdio(facade)`：单客户端 STDIO
- `McpLoopbackServer`：127.0.0.1 Streamable HTTP
- `createMcpServer(facade)`：嵌入自有 Transport

桌面客户端、CLI 和测试都应通过 Facade 接入，不能在 Transport 内复制连接业务。

## 安装

```bash
npm install @superconnectx/mcp
# 直接使用 CLI（无需打开桌面客户端）
npx @superconnectx/mcp --stdio --mode read-write
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

CLI 默认使用原生串口 Facade：

```bash
scx-mcp --stdio
scx-mcp --http --port 32180 --token CHANGE_ME --mode full --allow-export
```

用户模板导入：把符合模板格式的 `.json` 文件放入 `~/.superconnectx/templates`，或启动时指定目录：

```bash
scx-mcp --templates ./my-templates --stdio
```

同一 `id` 只接受更高版本，非法文件会被跳过并记录到启动诊断中。

## 安全约束

- HTTP 只应绑定 `127.0.0.1`，并使用 Bearer Token。
- 读取日志、会话和模板默认是只读操作。
- 写命令必须先获取会话级短时写租约。
- 停止会话、上传文件等破坏性操作必须由调用方显式确认。
- 模板是声明式 JSON，不能执行 Shell、JavaScript 或任意网络请求。

## 工具命名说明

以下名称是协议 API，不翻译：`serial_list_ports`、`session_list`、`log_tail`、`template_list`、`session_send`。用户界面、Skill 和诊断报告使用中文解释这些工具的用途。

## 维护边界

- `src/server.ts` 只维护 MCP 工具契约和输入校验。
- `src/transports.ts` 只维护 STDIO/HTTP 生命周期、安全和 session。
- 设备连接、日志文件、模板加载和权限由宿主实现 `McpFacade`。
- 修改工具契约时，同时更新 `src/types.ts`、Skill 的 `references/tools.md` 和宿主适配器测试。
