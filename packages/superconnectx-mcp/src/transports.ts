import http, { type IncomingMessage, type ServerResponse } from 'node:http'
import crypto from 'node:crypto'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { McpFacade } from './types.js'
import { createMcpServer } from './server.js'

export async function startMcpStdio(facade: McpFacade): Promise<() => Promise<void>> {
  const server = createMcpServer(facade); await server.connect(new StdioServerTransport()); return () => server.close()
}

export class McpLoopbackServer {
  private server: http.Server | null = null
  private port: number | null = null
  private token: Buffer
  private readonly sessions = new Map<string, { transport: StreamableHTTPServerTransport; close: () => Promise<void> }>()
  constructor(private readonly facade: McpFacade, token = crypto.randomBytes(32).toString('hex')) { this.token = Buffer.from(token) }
  get endpoint() { return this.port == null ? null : `http://127.0.0.1:${this.port}/mcp` }
  getClientConfig() { return { endpoint: this.endpoint, token: this.token.toString() } }
  rotateToken(token = crypto.randomBytes(32).toString('hex')) { this.token = Buffer.from(token); for (const session of this.sessions.values()) void session.close(); this.sessions.clear(); return token }
  async start(port: number) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid MCP port')
    if (this.server) throw new Error('MCP server already running')
    const server = http.createServer((req, res) => void this.handle(req, res)); await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve) }); this.server = server; this.port = port; return { port, endpoint: this.endpoint! }
  }
  async close() { await Promise.allSettled([...this.sessions.values()].map((session) => session.close())); this.sessions.clear(); const server = this.server; this.server = null; this.port = null; if (server) await new Promise<void>((resolve) => server.close(() => resolve())) }
  private async handle(req: IncomingMessage, res: ServerResponse) {
    try {
      const authorization = req.headers.authorization ?? ''; const supplied = Buffer.from(authorization.startsWith('Bearer ') ? authorization.slice(7) : ''); if (supplied.length !== this.token.length || !crypto.timingSafeEqual(supplied, this.token)) return this.error(res, 401, 'Unauthorized')
      if (req.url !== '/mcp' || !['POST', 'GET', 'DELETE'].includes(req.method ?? '')) return this.error(res, 404, 'Not found')
      const sessionId = req.headers['mcp-session-id'] as string | undefined
      if (req.method === 'POST' && !sessionId) { const body = await this.body(req); const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() }); const server = createMcpServer(this.facade); const close = async () => server.close(); await server.connect(transport); await transport.handleRequest(req, res, body); if (transport.sessionId) this.sessions.set(transport.sessionId, { transport, close }); return }
      const session = sessionId ? this.sessions.get(sessionId) : undefined; if (!session) return this.error(res, 404, 'MCP session not found'); await session.transport.handleRequest(req, res, req.method === 'POST' ? await this.body(req) : undefined)
    } catch (error) { this.error(res, 500, error instanceof Error ? error.message : 'Internal error') }
  }
  private async body(req: IncomingMessage) { const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined }
  private error(res: ServerResponse, status: number, message: string) { if (res.headersSent) return res.end(); res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ error: message })) }
}
