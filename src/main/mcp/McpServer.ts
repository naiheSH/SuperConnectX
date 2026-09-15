import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { McpFacade, McpPermission, McpPermissionPolicy } from '../../shared/mcp/McpTypes'
import { DEFAULT_MCP_PERMISSION_POLICY } from '../../shared/mcp/McpTypes'
import { z } from 'zod'

function textResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ data }) }]
  }
}

const WRITE_METHODS = new Set(['sendSession', 'sendSessionAndWait', 'runTemplateCommand', 'startSessionPort', 'startSavedSession', 'acquireWriteLease', 'releaseWriteLease'])
const DESTRUCTIVE_METHODS = new Set(['stopSession'])
const EXPORT_METHODS = new Set(['uploadSessionFile'])

function guardedFacade(facade: McpFacade, policy: McpPermissionPolicy): McpFacade {
  return new Proxy(facade, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver)
      if (typeof value !== 'function') return value
      const name = String(property)
      let permission: McpPermission | undefined
      if (WRITE_METHODS.has(name)) permission = 'write'
      else if (DESTRUCTIVE_METHODS.has(name)) permission = 'destructive'
      else if (EXPORT_METHODS.has(name)) permission = 'export'
      if (!permission || policy[permission]) return value.bind(target)
      return () => { throw new Error(`MCP permission denied: ${permission}`) }
    }
  }) as McpFacade
}

export function createMcpServer(facade: McpFacade, policy: McpPermissionPolicy = DEFAULT_MCP_PERMISSION_POLICY): McpServer {
  const effectivePolicy = { ...DEFAULT_MCP_PERMISSION_POLICY, ...policy }
  facade = guardedFacade(facade, effectivePolicy)
  const server = new McpServer({
    name: 'superconnectx-ai',
    version: '2.0.0'
  })
  const originalRegisterTool = server.registerTool.bind(server)
  const registerTool = server.registerTool.bind(server)
  server.registerTool = ((name: string, config: any, handler: any) => {
    const permission = WRITE_METHODS.has(toolMethod(name)) ? 'write' : DESTRUCTIVE_METHODS.has(toolMethod(name)) ? 'destructive' : EXPORT_METHODS.has(toolMethod(name)) ? 'export' : undefined
    if (permission && !effectivePolicy[permission]) return server
    return originalRegisterTool(name as never, config, handler)
  }) as typeof registerTool

  server.registerTool(
    'serial_list_ports',
    {
      title: '列出串口',
      description: '列出当前系统可用的串口。此工具只读，不会打开设备。',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => textResult(await facade.listSerialPorts())
  )

  server.registerTool(
    'log_summarize',
    {
      title: '摘要日志', description: '按错误、警告和普通信息统计日志尾部，并保留证据行。',
      inputSchema: { sessionId: z.string().min(1).max(128), maxBytes: z.number().int().min(1).max(1_048_576).optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ sessionId, maxBytes }) => {
      if (!facade.summarizeLog) throw new Error('Log summary is not available')
      return textResult(await facade.summarizeLog(sessionId, { maxBytes }))
    }
  )

  server.registerTool(
    'log_find_anomalies',
    {
      title: '发现日志异常', description: '查找错误、重启、断线、超时等常见异常证据。',
      inputSchema: { sessionId: z.string().min(1).max(128), maxBytes: z.number().int().min(1).max(1_048_576).optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ sessionId, maxBytes }) => {
      if (!facade.findLogAnomalies) throw new Error('Log anomaly detection is not available')
      return textResult(await facade.findLogAnomalies(sessionId, { maxBytes }))
    }
  )

  server.registerTool(
    'log_compare',
    {
      title: '比较日志', description: '比较两个连接日志尾部的差异。',
      inputSchema: { leftSessionId: z.string().min(1).max(128), rightSessionId: z.string().min(1).max(128), maxBytes: z.number().int().min(1).max(1_048_576).optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ leftSessionId, rightSessionId, maxBytes }) => {
      if (!facade.compareLogs) throw new Error('Log comparison is not available')
      return textResult(await facade.compareLogs(leftSessionId, rightSessionId, { maxBytes }))
    }
  )

  server.registerTool(
    'log_search',
    {
      title: '搜索日志',
      description: '在有界日志尾部按字面量搜索，并返回可定位的行号。',
      inputSchema: { sessionId: z.string().min(1).max(128), query: z.string().min(1).max(512), maxBytes: z.number().int().min(1).max(1_048_576).optional(), maxMatches: z.number().int().min(1).max(2_000).optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ sessionId, query, maxBytes, maxMatches }) => {
      if (!facade.searchLogs) throw new Error('Log search is not available')
      return textResult(await facade.searchLogs(sessionId, query, { maxBytes, maxMatches }))
    }
  )

  server.registerTool(
    'template_list',
    { title: '列出设备模板', description: '列出已加载的声明式设备模板。', annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true } },
    async () => textResult(await (facade.listTemplates?.() ?? []))
  )

  server.registerTool(
    'template_get',
    {
      title: '读取设备模板', description: '读取指定模板及其命令目录。',
      inputSchema: { id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ id }) => textResult(await (facade.getTemplate?.(id) ?? null))
  )

  server.registerTool(
    'log_analyze',
    {
      title: '分析日志', description: '使用声明式模板匹配日志事件，保留原始行号和文本证据。',
      inputSchema: { sessionId: z.string().min(1).max(128), templateId: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/), maxBytes: z.number().int().min(1).max(1_048_576).optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ sessionId, templateId, maxBytes }) => {
      if (!facade.analyzeLog) throw new Error('Log analysis is not available')
      return textResult(await facade.analyzeLog(sessionId, templateId, { maxBytes }))
    }
  )

  server.registerTool(
    'session_start_saved',
    {
      title: '打开已保存连接', description: '按客户端已有连接档案创建 AI 所有的会话。',
      inputSchema: { connectionId: z.number().int().positive(), ownerId: z.string().min(1).max(128) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ connectionId, ownerId }) => {
      if (!facade.startSavedSession) throw new Error('Saved session start is not available')
      return textResult(await facade.startSavedSession(connectionId, ownerId))
    }
  )

  server.registerTool(
    'session_start_port',
    {
      title: '打开串口会话', description: '打开当前系统已枚举的串口，并创建 AI 所有的连接会话。',
      inputSchema: { port: z.string().min(1).max(255), baudRate: z.number().int().min(1).max(4_000_000).optional(), ownerId: z.string().min(1).max(128) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ port, baudRate, ownerId }) => {
      if (!facade.startSessionPort) throw new Error('Session start is not available')
      return textResult(await facade.startSessionPort(port, baudRate, ownerId))
    }
  )

  server.registerTool(
    'session_acquire_write_lease',
    {
      title: '获取写租约', description: '为指定会话获取短时、互斥的 MCP 写租约。',
      inputSchema: { sessionId: z.string().min(1).max(128), ownerId: z.string().min(1).max(128), ttlMs: z.number().int().min(1_000).max(300_000).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ sessionId, ownerId, ttlMs }) => {
      if (!facade.acquireWriteLease) throw new Error('Write leases are not available')
      return textResult(await facade.acquireWriteLease(sessionId, ownerId, ttlMs))
    }
  )

  server.registerTool(
    'session_release_write_lease',
    {
      title: '释放写租约', description: '释放当前客户端持有的会话写租约。',
      inputSchema: { sessionId: z.string().min(1).max(128), ownerId: z.string().min(1).max(128) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
    },
    async ({ sessionId, ownerId }) => {
      if (!facade.releaseWriteLease) throw new Error('Write leases are not available')
      await facade.releaseWriteLease(sessionId, ownerId)
      return textResult({ released: true, sessionId, ownerId })
    }
  )

  server.registerTool(
    'session_send_and_wait',
    {
      title: '发送并等待响应', description: '发送命令并等待字面量或正则响应，带超时上限。',
      inputSchema: { sessionId: z.string().min(1).max(128), command: z.string().min(1).max(4096), ownerId: z.string().min(1).max(128), wait: z.object({ type: z.enum(['literal', 'regex']), pattern: z.string().min(1).max(512), timeoutMs: z.number().int().min(1).max(120_000) }) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ sessionId, command, ownerId, wait }) => {
      const assertLease = (facade as McpFacade & { assertWriteLease?: (sessionId: string, ownerId: string) => void }).assertWriteLease
      if (!assertLease) throw new Error('Write operations are not available')
      assertLease(sessionId, ownerId)
      if (!facade.sendSessionAndWait) throw new Error('Send-and-wait is not available')
      return textResult(await facade.sendSessionAndWait(sessionId, command, wait))
    }
  )

  server.registerTool(
    'session_run_template_command',
    {
      title: '执行模板命令', description: '按模板声明执行命令；所有命令都需要会话写租约。',
      inputSchema: { sessionId: z.string().min(1).max(128), templateId: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/), commandId: z.string().min(1).max(80), ownerId: z.string().min(1).max(128) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ sessionId, templateId, commandId, ownerId }) => {
      if (!facade.runTemplateCommand) throw new Error('Template command execution is not available')
      return textResult(await facade.runTemplateCommand(sessionId, templateId, commandId, ownerId))
    }
  )

  server.registerTool(
    'session_send',
    {
      title: '向会话发送命令', description: '发送命令前必须持有该会话的 MCP 写租约。',
      inputSchema: { sessionId: z.string().min(1).max(128), command: z.string().min(1).max(4096), ownerId: z.string().min(1).max(128) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
    },
    async ({ sessionId, command, ownerId }) => {
      const assertLease = (facade as McpFacade & { assertWriteLease?: (sessionId: string, ownerId: string) => void }).assertWriteLease
      if (!assertLease) throw new Error('Write operations are not available')
      assertLease(sessionId, ownerId)
      if (!facade.sendSession) throw new Error('Session send is not available')
      return textResult(await facade.sendSession(sessionId, command))
    }
  )

  server.registerTool(
    'session_upload_file',
    {
      title: '上传文件', description: '向 FTP 会话上传文件；需要写租约。',
      inputSchema: { sessionId: z.string().min(1).max(128), localFilePath: z.string().min(1).max(1024), remoteFileName: z.string().min(1).max(255), ownerId: z.string().min(1).max(128) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
    },
    async ({ sessionId, localFilePath, remoteFileName, ownerId }) => {
      if (!facade.uploadSessionFile) throw new Error('Session file upload is not available')
      return textResult(await facade.uploadSessionFile(sessionId, localFilePath, remoteFileName, ownerId))
    }
  )

  server.registerTool(
    'session_stop',
    {
      title: '停止会话', description: '停止会话前必须持有该会话的 MCP 写租约。',
      inputSchema: { sessionId: z.string().min(1).max(128), ownerId: z.string().min(1).max(128), confirm: z.literal(true) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true }
    },
    async ({ sessionId, ownerId, confirm }) => {
      if (confirm !== true) throw new Error('Explicit confirmation is required')
      const assertLease = (facade as McpFacade & { assertWriteLease?: (sessionId: string, ownerId: string) => void }).assertWriteLease
      if (!assertLease) throw new Error('Write operations are not available')
      assertLease(sessionId, ownerId)
      if (!facade.stopSession) throw new Error('Session stop is not available')
      return textResult(await facade.stopSession(sessionId))
    }
  )

  server.registerTool(
    'session_read',
    {
      title: '读取会话缓冲区', description: '读取连接当前接收缓冲区的有界尾部。',
      inputSchema: { sessionId: z.string().min(1).max(128), maxLines: z.number().int().min(1).max(2_000).optional() },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ sessionId, maxLines }) => {
      if (!facade.readSession) throw new Error('Session read is not available')
      return textResult(await facade.readSession(sessionId, { maxLines }))
    }
  )

  server.registerTool(
    'session_list',
    {
      title: '列出连接会话',
      description: '列出 SuperConnectX 当前运行中的连接会话。',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => textResult(await facade.listSessions())
  )

  server.registerTool(
    'log_tail',
    {
      title: '读取日志尾部',
      description: '读取指定连接日志的有界尾部，不会上传或删除日志。',
      inputSchema: {
        sessionId: z.string().min(1).max(128),
        maxBytes: z.number().int().min(1).max(1_048_576).optional(),
        maxLines: z.number().int().min(1).max(10_000).optional()
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ sessionId, maxBytes, maxLines }) => textResult(await facade.readLogTail(sessionId, { maxBytes, maxLines }))
  )

  return server
}

function toolMethod(name: string): string {
  const methods: Record<string, string> = {
    session_send: 'sendSession', session_send_and_wait: 'sendSessionAndWait', session_run_template_command: 'runTemplateCommand',
    session_start_port: 'startSessionPort', session_start_saved: 'startSavedSession', session_acquire_write_lease: 'acquireWriteLease',
    session_release_write_lease: 'releaseWriteLease', session_stop: 'stopSession', session_upload_file: 'uploadSessionFile'
  }
  return methods[name] ?? name
}
