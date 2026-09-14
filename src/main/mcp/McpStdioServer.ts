import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { McpFacade } from '../../shared/mcp/McpTypes'
import { createMcpServer } from './McpServer'

/** Connects the shared MCP tool core to stdin/stdout for a host process. */
export async function startMcpStdioServer(facade: McpFacade): Promise<() => Promise<void>> {
  const server = createMcpServer(facade)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  return async () => {
    await server.close()
  }
}
