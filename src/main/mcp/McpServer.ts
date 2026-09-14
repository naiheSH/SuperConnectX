import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { McpFacade } from '../../shared/mcp/McpTypes'
import { z } from 'zod'

function textResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ data }) }]
  }
}

export function createMcpServer(facade: McpFacade): McpServer {
  const server = new McpServer({
    name: 'superconnectx-ai',
    version: '2.0.0'
  })

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
