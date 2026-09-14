# SuperConnectX MCP 完整技术方案

## 1. 文档目的

本文档定义 SuperConnectX 下一代 MCP 能力的完整实现方案。目标是在不破坏现有串口、Telnet、FTP 和日志功能的前提下，为 AI 客户端提供可控、可审计、可扩展的设备调试能力。

本方案同时定义开发者自定义模板，使不同设备、协议和日志格式可以通过配置扩展，而不需要为每种设备重新修改 MCP 核心代码。

## 2. 设计结论

MCP、Skill、CLI 和桌面客户端承担不同职责：

```text
Connection Core
├── Electron IPC       GUI 使用
├── MCP Adapter        AI 调用
├── CLI / SDK          脚本和自动化调用
└── Skill              AI 使用流程、约束和模板说明
```

- MCP 是运行时协议服务，负责暴露工具、校验参数、执行操作并返回结果。
- Skill 是 AI 的使用说明和工作流，不直接访问串口。
- 开发者模板是设备能力描述，定义命令、响应匹配、日志解析和安全级别。
- 现有连接实现仍是唯一真实执行层，MCP 不重新实现串口或 Telnet 驱动。

## 3. 当前客户端基线

当前客户端是 Electron 应用，主进程通过 `IpcConnector` 统一路由：

- `WorkerConnector`：Worker 模式连接。
- `DirectConnector`：直接串口/Telnet 连接。
- `FtpConnector`：FTP 连接。
- `ConnectionStateManager`：连接状态、数据和 Renderer 通知。
- `ProtocolLogger` / `IpcAppLogger`：连接日志和应用日志。
- `IpcStorage` / `ConnectionStorage`：设置和连接档案。

当前主进程没有 MCP 服务、MCP SDK、独立 Application Core 或 AI 权限层。因此新实现应采用适配层方式逐步接入，避免对现有客户端进行一次性的大规模重构。

## 4. 总体架构

```text
AI Client
   │ MCP stdio 或 Streamable HTTP
   ▼
McpServer
   ├── Auth / Session / RateLimit
   ├── ToolRegistry
   ├── PermissionPolicy
   └── ResultMapper
          │
          ▼
McpApplicationFacade
   ├── SessionService
   ├── CommandService
   ├── LogService
   ├── TemplateService
   └── AuditService
          │
          ▼
Existing Connection Layer
   ├── IpcConnector
   ├── WorkerConnector
   ├── DirectConnector
   ├── FtpConnector
   └── ProtocolLogger
```

推荐的目录结构：

```text
src/main/mcp/
  McpServer.ts
  McpTransport.ts
  McpAuth.ts
  McpSessionStore.ts
  McpToolRegistry.ts
  McpResultMapper.ts
  McpRateLimiter.ts

src/main/application/
  ConnectionFacade.ts
  SessionService.ts
  CommandService.ts
  LogService.ts
  TemplateService.ts
  AuditService.ts

src/shared/mcp/
  schemas.ts
  errors.ts
  types.ts
  template-schema.ts

templates/
  generic-serial.yaml
  examples/

skills/superconnectx-mcp/
  SKILL.md
  references/template.md
  references/safety.md
  examples/
```

## 5. 传输方式

### 5.1 STDIO

适合单个 AI 客户端直接启动 MCP Server。优点是实现简单、无需监听端口、无局域网暴露风险。缺点是需要处理子进程启动、退出和配置传递。

### 5.2 Streamable HTTP

适合多个本地客户端或 Electron 内置服务。服务只绑定 `127.0.0.1`，固定 `/mcp` endpoint。必须使用 Bearer Token、Host 校验、请求大小限制、并发限制和 session 过期。

### 5.3 推荐方案

采用同一套 MCP Tool Core，同时提供两种 Transport：

1. 第一阶段支持 STDIO，快速验证工具契约。
2. 第二阶段由 Electron 按需启动 localhost HTTP，供多个客户端连接。

Transport 不得包含业务逻辑，所有工具都调用同一个 Application Facade。

## 6. 工具分层

### 6.1 基础只读工具

- `serial_list_ports`：列出可用串口。
- `session_list`：列出当前运行连接。
- `session_read`：读取有界接收缓冲区。
- `log_tail`：读取连接日志尾部。
- `log_search`：按关键词搜索连接日志。
- `template_list`：列出已启用模板。
- `template_get`：读取模板摘要和命令目录。

### 6.2 连接工具

- `session_start_port`：打开真实存在的串口。
- `session_start_saved`：按已有连接档案打开 Telnet/FTP。
- `session_stop`：关闭 AI 创建的连接。
- `session_status`：查询连接状态、端口和最近活动。

### 6.3 写入工具

- `session_send`：发送一次命令。
- `session_send_and_wait`：发送并等待字面量或正则匹配。
- `session_run_template_command`：按模板执行命令。
- `session_upload_file`：仅对明确允许的 FTP 模板开放。

写工具默认关闭。开启写权限后仍需满足连接级写租约和模板级安全策略。

### 6.4 分析工具

- `log_analyze`：按模板解析日志并输出结构化事件。
- `log_summarize`：生成指定时间范围的摘要。
- `log_find_anomalies`：查找错误、重启、断线、超时和速度异常。
- `log_compare`：比较两段日志的差异。

分析工具只读取日志，不代表 AI 可以修改日志。分析结果必须保留原始行号、时间戳和来源文件，便于人工复核。

## 7. 开发者自定义模板

模板是本方案的核心扩展点。模板不允许执行任意 JavaScript，只允许声明式配置。

### 7.1 模板示例

```yaml
id: gw01
version: 1
name: GW01 盒子
description: 网关设备串口调试模板

connection:
  types: [serial]
  baudRates: [115200, 921600]
  defaultBaudRate: 115200
  encodings: [utf8, gb18030]

permissions:
  defaultMode: read-only
  allowWrite: true
  requireConfirmation: true
  allowCloseUserSession: false

commands:
  version:
    label: 查询版本
    text: "AT+VERSION"
    lineEnding: CRLF
    wait:
      type: literal
      pattern: "OK"
      timeoutMs: 5000
    output: version
    risk: read

  reboot:
    label: 重启设备
    text: "AT+REBOOT"
    lineEnding: CRLF
    wait:
      type: literal
      pattern: "REBOOT"
      timeoutMs: 3000
    risk: destructive
    confirmation: "即将重启设备，是否继续？"

log:
  timestamp:
    pattern: "^(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})"
    format: "YYYY-MM-DD HH:mm:ss"
  events:
    - id: reboot
      level: warning
      pattern: "(?i)reboot|reset|watchdog"
      summary: 设备发生重启或看门狗复位
    - id: network_error
      level: error
      pattern: "(?i)network|socket|dns|timeout"
      summary: 网络连接异常
    - id: download_speed
      level: info
      pattern: "(?i)(?<bytes>\\d+) bytes.*(?<seconds>[\\d.]+) s"
      summary: 下载速度统计
      calculate: bytes / seconds

workflows:
  check_health:
    description: 检查设备基础健康状态
    steps:
      - command: version
      - read:
          durationMs: 1000
      - analyze:
          events: [reboot, network_error]
```

### 7.2 模板约束

- 模板必须通过 JSON Schema/Zod 校验。
- `text`、`pattern`、`calculate` 等字段有长度和复杂度限制。
- 禁止模板调用文件系统、Shell、网络或任意代码。
- `risk` 至少分为 `read`、`write`、`destructive` 三类。
- `destructive` 操作必须人工确认，Skill 不能绕过确认。
- 模板版本必须单调递增，运行时记录模板 ID 和版本。
- 模板解析失败时不能影响已有连接。

### 7.3 模板加载位置

```text
内置模板：resources/templates/
用户模板：<userData>/mcp/templates/
项目模板：当前项目目录下的 .superconnectx/templates/
```

优先级为项目模板 > 用户模板 > 内置模板。模板加载采用白名单目录、原子写入和版本校验。

## 8. 日志能力

### 8.1 AI 读取日志

AI 可以读取：

- 当前连接日志的最近 N 行。
- 指定偏移量之后的增量内容。
- 指定时间范围内的日志。
- 关键词、正则或模板事件匹配结果。
- 日志文件信息、截断状态和丢弃计数。

所有读取都必须有上限：最大字节数、最大行数、最大搜索时间和最大匹配数量。MCP 缓冲区只用于交互式观察，完整取证仍使用原始连接日志文件。

### 8.2 AI 解读日志

日志解读分成两步：

1. `LogService` 按模板把原始文本解析为结构化事件。
2. AI 根据结构化事件生成摘要、根因假设和下一步建议。

返回结果必须包含：

```json
{
  "summary": "设备在 10:21:03 发生一次 watchdog 重启",
  "severity": "warning",
  "events": [
    {
      "eventId": "reboot",
      "timestamp": "2026-09-14T10:21:03+08:00",
      "source": "connection-log",
      "lineStart": 182,
      "lineEnd": 185,
      "evidence": ["watchdog reset"]
    }
  ],
  "confidence": "medium",
  "nextActions": ["检查设备供电和网络断开时间点"]
}
```

AI 的“解读”必须明确区分事实、推断和建议，不能把推断描述成设备已经确认的结果。

### 8.3 AI 发送日志

“发送日志”有三种不同含义：

1. 把客户端已有日志提供给 AI：允许，通过 `log_tail`、`log_search` 或 `log_analyze`。
2. 把日志导出为文件：允许，但必须由用户指定目标路径并经过本地 UI/权限确认。
3. 把日志上传到云端：默认禁止。若未来提供，必须单独增加上传工具、脱敏策略、用户确认、目标域名白名单和传输审计。

MCP 不应默认把串口日志发送到第三方模型服务。模型调用由 AI 客户端决定，SuperConnectX 只返回经过大小限制和脱敏处理的数据。

## 9. 权限和安全

权限分为四级：

| 级别 | 能力 |
|---|---|
| `read` | 列串口、查询状态、读数据、读日志 |
| `write` | 发送普通设备命令 |
| `destructive` | 重启、清配置、删除文件、关闭用户连接 |
| `export` | 导出或上传日志、配置和凭证相关数据 |

安全要求：

- 默认只读。
- Token 只在用户明确复制配置时显示。
- 密码、Token、Authorization、Wi-Fi Key 等字段递归脱敏。
- MCP session 断开不自动关闭业务连接。
- 每个连接最多一个 AI 写租约。
- GUI 发送和 MCP 发送必须进入同一条连接级 FIFO 队列。
- 不能通过模板、配置文件或 MCP 工具提升权限。
- 所有写操作记录调用者、模板、命令摘要、目标 session 和结果。
- 原始命令正文默认不落盘，只记录摘要；用户可配置为脱敏全文。

## 10. 连接生命周期

MCP session 与设备 session 必须分离：

```text
MCP Client Session
    └── 0..N 个设备 Session
```

- 一个 MCP Client 可以管理多个串口或 Telnet 连接。
- 多个 MCP Client 可以读取同一连接。
- 同一连接同时只能有一个 AI 写租约。
- AI 创建的连接应标记为 AI-owned，并由 MCP 负责最终关闭。
- GUI 创建的连接默认标记为 user-owned，AI 默认不能关闭。
- 连接关闭、Worker 退出和重连必须校验 generation，旧回调不能影响新连接。

## 11. MCP 工具返回契约

所有工具统一返回：

```json
{
  "data": {},
  "meta": {
    "requestId": "...",
    "truncated": false,
    "source": "superconnectx"
  }
}
```

业务失败返回：

```json
{
  "data": {
    "error": {
      "code": "SESSION_NOT_FOUND",
      "message": "连接不存在",
      "retryable": false
    }
  }
}
```

建议错误码：

```text
PORT_NOT_FOUND
PORT_BUSY
SESSION_NOT_FOUND
SESSION_WRITE_LOCKED
PERMISSION_DENIED
TEMPLATE_NOT_FOUND
TEMPLATE_INVALID
COMMAND_TIMEOUT
READ_LIMIT_EXCEEDED
LOG_NOT_FOUND
LOG_SEARCH_TIMEOUT
INTERNAL_ERROR
```

## 12. Skill 模板

每个设备模板可以对应一个 Skill，但 Skill 只描述使用方法，不包含秘密信息：

```markdown
# GW01 设备调试

## 适用范围

- 设备模板：gw01
- 适用连接：串口

## 操作规则

- 先调用 serial_list_ports，再打开端口。
- 发送命令前说明目标端口、命令和风险等级。
- reboot、reset、clear 等 destructive 命令必须请求人工确认。
- 读取日志时优先使用 log_tail 和 log_search，不要求 MCP 无限订阅。
- 解读日志时区分 evidence、推断和 nextActions。

## 健康检查流程

1. serial_list_ports
2. session_start_port
3. session_run_template_command(commandId=version)
4. session_read
5. log_analyze(events=[reboot, network_error])

## 输出要求

- 给出时间、原始证据、严重级别和置信度。
- 不把“发送成功”描述成“设备执行成功”。
```

## 13. CLI 和 SDK

MCP 之外建议提供稳定的本地 CLI：

```bash
superconnectx-cli ports list
superconnectx-cli session open --port COM3 --baud 115200
superconnectx-cli session send --session <id> --text 'AT+VERSION'
superconnectx-cli log analyze --session <id> --template gw01
```

CLI 和 MCP 必须调用同一个 Application Facade，不能各自复制连接逻辑。未来可提供 TypeScript SDK，让测试和自动化直接调用同一套类型契约。

## 14. 实施阶段

### 阶段一：核心抽象

- 从 `IpcConnector` 抽出最小 `ConnectionFacade`。
- 保持现有 IPC 行为不变。
- 增加 session、读缓存和日志读取接口。

### 阶段二：MCP MVP

- 引入 MCP SDK。
- 实现 STDIO transport。
- 完成 `serial_list_ports`、`session_list`、`session_read`、`log_tail`、`session_send`。
- 默认只读，写操作显式开启。

### 阶段三：模板和分析

- 实现模板 schema、加载、校验和版本管理。
- 实现 `session_run_template_command`。
- 实现 `log_analyze`、`log_search`、`log_summarize`。
- 提供第一个 GW01 或通用串口模板。

### 阶段四：桌面集成

- Electron 设置页管理 MCP 启停、Token、权限和模板。
- 按需启用 Streamable HTTP。
- 提供配置复制和连接自检。

### 阶段五：CLI、Skill 和发布

- 发布 CLI/SDK。
- 发布 SuperConnectX MCP Skill 模板。
- 完成 Windows、Linux、macOS 打包测试。

## 15. 测试和验收

必须覆盖：

- Tool input/output schema 校验。
- 未知端口、忙端口、断线、重连和旧回调。
- 两个客户端同时写入时的租约拒绝。
- GUI/MCP 同时发送时的 FIFO 顺序。
- RX 缓冲上限和慢客户端行为。
- 日志读取上限、搜索超时、文件不存在和截断标记。
- 模板非法正则、超长命令和未知字段。
- destructive 操作确认和权限拒绝。
- Token 轮换后旧 session 失效。
- 日志中的密码、Token、Authorization 等字段脱敏。
- STDIO 进程退出和 HTTP session DELETE。
- Windows COM、Linux `/dev/tty*` 和 macOS 串口路径。

验收标准：

- 不影响原有 GUI 连接和日志功能。
- MCP 关闭后客户端仍可正常使用。
- 任一 MCP Client 的读取速度不会阻塞串口接收。
- 所有写操作都可以追溯到模板、session 和调用者。
- AI 解读结果能够返回可定位的原始证据。

## 16. 明确不做的事情

第一版不做：

- 云端直接控制用户本地串口。
- 任意 JavaScript 模板。
- 无限实时日志流。
- 自动上传全部日志到第三方模型。
- 用 MCP 替代现有 GUI。
- 一次性实现几十个工具和完整多实例控制面板。

## 17. 最终建议

完整实现应当是“声明式模板 + Application Core + MCP Adapter + Skill + CLI/SDK”，而不是单独做一个 MCP Server。

其中：

- 模板解决设备差异。
- Core 解决连接和日志复用。
- MCP 解决 AI 调用。
- Skill 解决 AI 正确使用。
- CLI/SDK 解决非 AI 自动化。

这套结构能够集中落实安全和并发设计，同时避免对当前客户端进行一次性的大规模重写。
