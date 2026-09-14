import test from 'node:test'
import assert from 'node:assert/strict'
import { createMcpServer, McpLoopbackServer } from '../dist/index.js'

test('exports server core and loopback transport', async () => {
  const facade = { listSerialPorts: async () => [], listSessions: async () => [], readLogTail: async () => ({ sessionId: 'x', lines: [], truncated: false }) }
  assert.ok(createMcpServer(facade))
  const server = new McpLoopbackServer(facade, 'test-token')
  const started = await server.start(32191)
  assert.equal(started.endpoint, 'http://127.0.0.1:32191/mcp')
  assert.equal(server.getClientConfig().token, 'test-token')
  assert.notEqual(server.rotateToken('rotated'), 'test-token')
  await server.close()
})
