import http from 'node:http'
import { describe, expect, it } from 'vitest'
import McpHttpServer from '../../src/main/mcp/McpHttpServer'

function request(port: number, token: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: '/mcp',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, ...headers }
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    req.end()
  })
}

describe('McpHttpServer', () => {
  it('binds loopback and rejects invalid auth/origin/host requests', async () => {
    const facade = {
      listSerialPorts: async () => [],
      listSessions: async () => [],
      readLogTail: async () => ({ sessionId: 's', lines: [], truncated: false })
    }
    const server = new McpHttpServer(facade, 'test-token')
    const info = await server.start(1023).catch(() => null)
    expect(info).toBeNull()

    const running = new McpHttpServer(facade, 'test-token')
    const started = await running.start(32189)
    await expect(request(32189, 'wrong')).resolves.toMatchObject({ status: 401 })
    await expect(request(32189, 'test-token', { Origin: 'https://example.com' })).resolves.toMatchObject({ status: 403 })
    await expect(request(32189, 'test-token', { Host: 'example.com' })).resolves.toMatchObject({ status: 403 })
    expect(started.endpoint).toBe('http://127.0.0.1:32189/mcp')
    await running.close()
  })
})
