# 工具路由（Tool routing）

工具名称是 MCP 协议标识，必须保持英文；下表说明使用场景。

| 场景 | Tools（工具） |
| --- | --- |
| 端口/会话发现 | `serial_list_ports`, `session_list`, `session_read` |
| 日志证据 | `log_tail`, `log_search`, `log_summarize`, `log_find_anomalies`, `log_compare` |
| 模板支持 | `template_list`, `template_get`, `log_analyze` |
| 建立连接 | `session_start_port`, `session_start_saved` |
| 安全写入 | `session_acquire_write_lease`, `session_send_and_wait`, `session_run_template_command`, `session_release_write_lease` |
| 破坏性操作 | `session_stop` 必须 `confirm: true`；上传仅限 FTP 且必须持有写租约 |
