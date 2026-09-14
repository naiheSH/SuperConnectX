# Tool routing

| Intent | Tools |
| --- | --- |
| Port/session discovery | `serial_list_ports`, `session_list`, `session_read` |
| Log evidence | `log_tail`, `log_search`, `log_summarize`, `log_find_anomalies`, `log_compare` |
| Template support | `template_list`, `template_get`, `log_analyze` |
| Connect | `session_start_port`, `session_start_saved` |
| Safe write | `session_acquire_write_lease`, `session_send_and_wait`, `session_run_template_command`, `session_release_write_lease` |
| Destructive | `session_stop` with `confirm: true`; upload only for FTP and with a lease |
