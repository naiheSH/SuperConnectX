---
name: superconnectx-mcp
description: 使用 SuperConnectX MCP 检查串口、连接会话、设备模板和日志；发送命令或执行破坏性操作前必须获取显式写租约。
---

# SuperConnectX MCP Skill（SuperConnectX MCP 技能）

使用独立的 `@superconnectx/mcp` 包，或连接 SuperConnectX AI 桌面端提供的 MCP Endpoint。工具名和协议字段保留英文，解释和回复优先使用中文。所有操作都必须有证据、有限制、有边界。

## 运行时选择

- `scx-mcp --stdio`：独立 CLI，桌面客户端可以关闭；默认完整操作权限，可用 `--mode read-only` 限制。
- 桌面端 MCP：需要 SuperConnectX 客户端运行，在“设置 → MCP”中启用并选择权限。
- HTTP MCP：连接本机或受控远端 Endpoint，必须提供 Bearer Token。

Skill 本身不连接设备，也不启动进程；它必须配合上述任一 MCP runtime 使用。

## 工作流程（Workflow）

1. 使用 `serial_list_ports` 枚举串口，绝不猜测设备路径。
2. 创建会话前先调用 `session_list`。
3. 诊断优先使用 `log_tail`、`log_search`、`log_summarize`、`log_find_anomalies` 和 `log_analyze`。
4. 执行设备专用命令前先读取 `template_list`/`template_get`。
5. 任何写入前调用 `session_acquire_write_lease`，完成后立即调用 `session_release_write_lease`。
6. 优先使用 `session_run_template_command` 或有超时的 `session_send_and_wait`，不要执行无边界写入。
7. `session_stop` 和文件上传必须要求用户明确确认。

## 证据输出格式（Evidence format）

回复应包含：结论、`sessionId`、日志行号、原始证据文本、影响和下一步建议。不得输出密码、Bearer Token 或 Authorization 原文。

推荐格式：

```text
结论：……
证据：session=<id>，line=<行号>，text="……"
影响：……
建议：……
```

工具路由见 [references/tools.md](references/tools.md)；写入和诊断安全规则见 [references/safety.md](references/safety.md)。
