#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { startMcpStdio, McpLoopbackServer } from './transports.js'
import type { McpFacade, McpPermissionPolicy } from './types.js'
import { NativeMcpFacade } from './native-facade.js'

function usage(): never {
  console.error('Usage: scx-mcp [--facade ./facade.mjs] [--stdio | --http] [--port 32180] [--token TOKEN] [--mode read-only|read-write|full] [--allow-export]')
  process.exit(2)
}
const args = process.argv.slice(2)
const value = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const facadePath = value('--facade') ?? process.env.SCX_MCP_FACADE_MODULE
const mode = value('--mode') ?? 'read-only'
if (!['read-only', 'read-write', 'full'].includes(mode)) usage()
const policy: McpPermissionPolicy = { read: true, write: mode !== 'read-only', destructive: mode === 'full', export: mode === 'full' && args.includes('--allow-export') }
const facade = facadePath ? ((() => { return import(pathToFileURL(facadePath!).href) })()) : null
const resolvedFacade = facade ? ((await facade).default ?? (await facade).facade) as McpFacade : new NativeMcpFacade()
if (!resolvedFacade || typeof resolvedFacade.listSerialPorts !== 'function') throw new Error('Facade module must export default or facade implementing McpFacade')
if (args.includes('--http')) {
  const server = new McpLoopbackServer(resolvedFacade, value('--token') ?? process.env.SCX_MCP_TOKEN, policy)
  await server.start(Number(value('--port') ?? process.env.SCX_MCP_PORT ?? 32180))
  console.error(`SuperConnectX MCP listening at ${server.endpoint}`)
  process.once('SIGINT', () => void server.close().then(() => process.exit(0)))
} else {
  await startMcpStdio(resolvedFacade, policy)
}
