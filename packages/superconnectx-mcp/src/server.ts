import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { McpFacade } from './types.js'

const result = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify({ data }) }] })
const lease = (facade: McpFacade, sessionId: string, ownerId: string) => {
  if (!facade.assertWriteLease) throw new Error('Write lease required')
  facade.assertWriteLease(sessionId, ownerId)
}

export function createMcpServer(facade: McpFacade): McpServer {
  const server = new McpServer({ name: 'superconnectx-mcp', version: '0.1.0' })
  server.registerTool('serial_list_ports', { title: 'List serial ports', description: 'List available serial ports.', annotations: { readOnlyHint: true, idempotentHint: true } }, async () => result(await facade.listSerialPorts()))
  server.registerTool('session_list', { title: 'List sessions', description: 'List active SuperConnectX sessions.', annotations: { readOnlyHint: true, idempotentHint: true } }, async () => result(await facade.listSessions()))
  server.registerTool('session_read', { title: 'Read session buffer', description: 'Read bounded session output.', inputSchema: { sessionId: z.string().min(1), maxLines: z.number().int().min(1).max(2000).optional() }, annotations: { readOnlyHint: true, idempotentHint: true } }, async ({ sessionId, maxLines }) => result(await (facade as any).readSession(sessionId, { maxLines })))
  server.registerTool('log_tail', { title: 'Tail log', description: 'Read a bounded log tail.', inputSchema: { sessionId: z.string().min(1), maxBytes: z.number().int().min(1).max(1048576).optional(), maxLines: z.number().int().min(1).max(10000).optional() }, annotations: { readOnlyHint: true, idempotentHint: true } }, async ({ sessionId, maxBytes, maxLines }) => result(await facade.readLogTail(sessionId, { maxBytes, maxLines })))
  server.registerTool('log_search', { title: 'Search log', description: 'Search bounded log evidence.', inputSchema: { sessionId: z.string().min(1), query: z.string().min(1).max(512), maxBytes: z.number().int().min(1).max(1048576).optional(), maxMatches: z.number().int().min(1).max(2000).optional() }, annotations: { readOnlyHint: true, idempotentHint: true } }, async ({ sessionId, query, maxBytes, maxMatches }) => result(await facade.searchLogs?.(sessionId, query, { maxBytes, maxMatches })))
  server.registerTool('template_list', { title: 'List templates', description: 'List loaded device templates.', annotations: { readOnlyHint: true, idempotentHint: true } }, async () => result(await facade.listTemplates?.() ?? []))
  server.registerTool('template_get', { title: 'Get template', description: 'Get a device template.', inputSchema: { id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/) }, annotations: { readOnlyHint: true, idempotentHint: true } }, async ({ id }) => result(await facade.getTemplate?.(id) ?? null))
  server.registerTool('log_analyze', { title: 'Analyze log', description: 'Analyze log with a declarative template.', inputSchema: { sessionId: z.string().min(1), templateId: z.string().min(1), maxBytes: z.number().int().min(1).max(1048576).optional() }, annotations: { readOnlyHint: true, idempotentHint: true } }, async ({ sessionId, templateId, maxBytes }) => result(await facade.analyzeLog?.(sessionId, templateId, { maxBytes })))
  server.registerTool('session_acquire_write_lease', { title: 'Acquire write lease', description: 'Acquire a short exclusive write lease.', inputSchema: { sessionId: z.string().min(1), ownerId: z.string().min(1), ttlMs: z.number().int().min(1000).max(300000).optional() } }, async ({ sessionId, ownerId, ttlMs }) => result(await facade.acquireWriteLease?.(sessionId, ownerId, ttlMs)))
  server.registerTool('session_release_write_lease', { title: 'Release write lease', description: 'Release a write lease.', inputSchema: { sessionId: z.string().min(1), ownerId: z.string().min(1) } }, async ({ sessionId, ownerId }) => { await facade.releaseWriteLease?.(sessionId, ownerId); return result({ released: true }) })
  server.registerTool('session_send', { title: 'Send command', description: 'Send a command with a write lease.', inputSchema: { sessionId: z.string().min(1), command: z.string().min(1).max(4096), ownerId: z.string().min(1) } }, async ({ sessionId, command, ownerId }) => { lease(facade, sessionId, ownerId); return result(await facade.sendSession?.(sessionId, command)) })
  server.registerTool('session_stop', { title: 'Stop session', description: 'Stop a session with explicit confirmation and a write lease.', inputSchema: { sessionId: z.string().min(1), ownerId: z.string().min(1), confirm: z.literal(true) }, annotations: { destructiveHint: true } }, async ({ sessionId, ownerId, confirm }) => { if (!confirm) throw new Error('Explicit confirmation required'); lease(facade, sessionId, ownerId); return result(await facade.stopSession?.(sessionId)) })
  return server
}
