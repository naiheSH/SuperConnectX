# @superconnectx/mcp-cli

独立运行的 SuperConnectX MCP CLI。**不需要启动桌面客户端**，安装后可直接把 `scx-mcp` 配成 AI 客户端的 MCP STDIO 服务。

## 安装

```bash
npm install -g @superconnectx/mcp-cli
# 或使用本地 release 产物
npm install -g ./superconnectx-mcp-cli-0.1.0.tgz
```

先自检：

```bash
scx-mcp --doctor
scx-mcp --print-config
```

## AI 客户端配置

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

默认开放完整本地操作权限；如需收紧：

```bash
scx-mcp --stdio --mode read-only
scx-mcp --stdio --mode read-write
scx-mcp --stdio --mode full --no-export
```

HTTP 模式（仅本机 loopback）：

```bash
scx-mcp --http --port 32180 --token CHANGE_ME
```

## 与 Skill / 桌面端的关系

| 组件 | 是否需要桌面端 | 作用 |
| --- | --- | --- |
| `scx-mcp`（本包） | 否 | 真正连串口、跑 MCP 工具 |
| `superconnectx-mcp` Skill | 否 | 只教 AI 怎么安全调用工具 |
| 桌面端 MCP HTTP | 是 | 复用 GUI 已有会话/日志 |

Skill 安装见仓库 `packages/superconnectx-mcp-skill/INSTALL.md`，或桌面端「设置 → MCP → 安装 Skill」。

## 自定义后端

```bash
scx-mcp --facade ./my-facade.mjs --stdio
scx-mcp --templates ~/.superconnectx/templates --stdio
```
