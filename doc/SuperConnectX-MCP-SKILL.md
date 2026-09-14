# SuperConnectX MCP Skill

## 适用范围

使用 `superconnectx-ai` MCP 读取串口、连接会话和日志；需要写入时必须先获取会话写租约。

## 推荐工作流

1. 调用 `serial_list_ports` 确认端口，不猜测设备路径。
2. 调用 `session_list` 查看 GUI 已有会话。
3. 优先使用 `log_tail`、`log_search`、`log_summarize` 和 `log_find_anomalies` 读取证据。
4. 需要设备差异化解析时先调用 `template_list`/`template_get`，再使用 `log_analyze`。
5. 需要创建连接时使用 `session_start_port` 或 `session_start_saved`，并记录返回的 `sessionId`。
6. 任何写操作前调用 `session_acquire_write_lease`，完成后调用 `session_release_write_lease`。
7. 写命令优先使用 `session_run_template_command` 或 `session_send_and_wait`，避免无边界等待。

## 安全约束

- 不把 Token、密码或 Authorization 原文写入消息和日志。
- 不通过模板执行 Shell、JavaScript 或任意网络请求。
- `session_stop` 和 `session_upload_file` 属于破坏性操作，必须传入显式 `confirm: true`（停止）并持有写租约。
- 所有结论必须引用 session、日志文件、行号或原始证据行。
- 遇到端口不存在、会话不存在、写租约冲突或超时，应停止重试并向用户说明。

## 日志解读输出格式

```text
结论：...
证据：session=<id>, line=<n>, text="..."
影响：...
建议：...
```
