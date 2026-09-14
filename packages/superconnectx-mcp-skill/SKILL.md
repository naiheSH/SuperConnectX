---
name: superconnectx-mcp
description: Use SuperConnectX MCP to inspect serial ports, sessions, device templates, and logs; acquire an explicit write lease before sending commands or performing destructive operations.
---

# SuperConnectX MCP Skill

Use the standalone `@superconnectx/mcp` package or a SuperConnectX AI desktop endpoint. Keep operations evidence-based and bounded.

## Workflow

1. Discover ports with `serial_list_ports`; never guess a device path.
2. Inspect `session_list` before creating a session.
3. Prefer `log_tail`, `log_search`, `log_summarize`, `log_find_anomalies`, and `log_analyze` for diagnosis.
4. Load `template_list`/`template_get` before using device-specific commands.
5. Before any write, acquire `session_acquire_write_lease`; release it immediately after the operation.
6. Prefer `session_run_template_command` or bounded `session_send_and_wait` over unbounded writes.
7. Require explicit confirmation for `session_stop` and file uploads.

## Evidence format

Return: conclusion, `sessionId`, log line number, original evidence text, impact, and next action. Do not expose passwords, bearer tokens, or authorization values.

Read [references/tools.md](references/tools.md) for the tool contract and [references/safety.md](references/safety.md) for write/diagnostic rules.
