#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { McpLoopbackServer, startMcpStdio, NativeMcpFacade, TemplateRegistry } from '@superconnectx/mcp'
import type { McpFacade, McpPermissionPolicy } from '@superconnectx/mcp'

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const value = (name: string) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : undefined }
  if (argv.includes('--version')) { console.log('0.1.0'); return }
  const mode = value('--mode') ?? 'full'
  if (!['read-only', 'read-write', 'full'].includes(mode)) throw new Error('Invalid --mode')
  const policy: McpPermissionPolicy = { read: true, write: mode !== 'read-only', destructive: mode === 'full', export: mode === 'full' && !argv.includes('--no-export') }
  const registry = new TemplateRegistry()
  const templateDirectory = value('--templates') ?? process.env.SCX_MCP_TEMPLATES ?? join(homedir(), '.superconnectx', 'templates')
  await registry.loadDirectory(templateDirectory)
  const facadePath = value('--facade') ?? process.env.SCX_MCP_FACADE_MODULE
  const facade = facadePath ? (await import(pathToFileURL(facadePath).href)).default : new NativeMcpFacade(registry)
  if (!facade || typeof (facade as McpFacade).listSerialPorts !== 'function') throw new Error('Invalid Facade')
  if (argv.includes('--http')) {
    const server = new McpLoopbackServer(facade, value('--token') ?? process.env.SCX_MCP_TOKEN, policy)
    await server.start(Number(value('--port') ?? process.env.SCX_MCP_PORT ?? 32180))
    console.error(`SuperConnectX MCP listening at ${server.endpoint}`)
    process.once('SIGINT', () => void server.close().then(() => process.exit(0)))
  } else await startMcpStdio(facade, policy)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
