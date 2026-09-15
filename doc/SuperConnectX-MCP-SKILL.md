# SuperConnectX MCP / Skill / CLI

## 结论：当前逻辑可以定版

| 组件 | 角色 |
| --- | --- |
| MCP | 真正的能力（工具 + 权限 + 连接/日志） |
| Skill | 只是 MCP 的使用封装，方便 AI 按规范调用 |
| CLI `scx-mcp` | 独立 MCP runtime，不需要开客户端 |
| 桌面 MCP HTTP | 可选 runtime，复用 GUI 已连接会话 |

## Runtime 能力差异

| 能力 | 桌面 MCP | 独立 CLI |
| --- | --- | --- |
| 看到 GUI 已连接会话 | 能 | 不能 |
| 读会话缓冲 / 日志 | 能 | 仅 CLI 自己建的会话 |
| 对 GUI 会话发命令 | 持有写租约后可以 | 否 |
| 关闭 GUI 会话 | **禁止**（user-owned） | 无此会话 |
| 同端口再开连接 | 明确报占用 | 通常 OS 独占失败 |

## 安装

- CLI：`npm install -g @superconnectx/mcp-cli` → `scx-mcp --doctor`
- Skill：`packages/superconnectx-mcp-skill/INSTALL.md`，或设置页「Skill 封装 → 一键安装」
- 桌面：设置 → MCP → 启用服务

Skill 改文档后执行：`npm run sync:mcp-skill`

## 返回契约与审计

- 工具返回统一：`{ data, meta: { requestId, truncated, source: "superconnectx" } }`
- 业务失败：`data.error = { code, message, retryable }`
- 写操作审计：CLI → `~/.superconnectx/mcp-audit.jsonl`；桌面 → 应用日志 `[MCP][audit]`（只记脱敏摘要，不落命令原文）

## 暂缓

- `@superconnectx/mcp-cli` 正式发布到 npm
