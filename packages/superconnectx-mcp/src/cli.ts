#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { startMcpStdio, McpLoopbackServer } from './transports.js'
import type { McpFacade, McpPermissionPolicy } from './types.js'
import { NativeMcpFacade } from './native-facade.js'
import { TemplateRegistry } from './templates.js'
import { homedir } from 'node:os'
import { join } from 'node:path'

function usage(): never {
  console.error('Usage: scx-mcp [--facade ./facade.mjs] [--stdio | --http] [--port 32180] [--token TOKEN] [--mode read-only|read-write|full] [--allow-export]')
  process.exit(2)
}
const args = process.argv.slice(2)
const value = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
if (args.includes('--version')) { console.log('0.1.0'); process.exit(0) }
const facadePath = value('--facade') ?? process.env.SCX_MCP_FACADE_MODULE
const mode = value('--mode') ?? 'full'
if (!['read-only', 'read-write', 'full'].includes(mode)) usage()
const policy: McpPermissionPolicy = { read: true, write: mode !== 'read-only', destructive: mode === 'full', export: mode === 'full' && (!args.includes('--no-export') || args.includes('--allow-export')) }
const registry = new TemplateRegistry()
const templateDirectory = value('--templates') ?? process.env.SCX_MCP_TEMPLATES ?? join(homedir(), '.superconnectx', 'templates')
const templateResult = await registry.loadDirectory(templateDirectory)
if (args.includes('--doctor')) {
  const probe = new NativeMcpFacade(registry)
  console.log(JSON.stringify({ ok: true, mode, templateDirectory, templates: templateResult.loaded.length, skippedTemplates: templateResult.skipped, serialPorts: await probe.listSerialPorts() }, null, 2))
  process.exit(0)
}
if (args.includes('--print-config')) {
  const command = ['scx-mcp', '--stdio', '--mode', mode]
  if (args.includes('--no-export')) command.push('--no-export')
  if (facadePath) command.push('--facade', facadePath)
  if (templateDirectory !== join(homedir(), '.superconnectx', 'templates')) command.push('--templates', templateDirectory)
  console.log(JSON.stringify({ mcpServers: { superconnectx: { command: command[0], args: command.slice(1) } } }, null, 2))
  process.exit(0)
}
const facade = facadePath ? ((() => { return import(pathToFileURL(facadePath!).href) })()) : null
const resolvedFacade = facade ? ((await facade).default ?? (await facade).facade) as McpFacade : new NativeMcpFacade(registry)
if (!resolvedFacade || typeof resolvedFacade.listSerialPorts !== 'function') throw new Error('Facade module must export default or facade implementing McpFacade')
if (args.includes('--http')) {
  const server = new McpLoopbackServer(resolvedFacade, value('--token') ?? process.env.SCX_MCP_TOKEN, policy)
  await server.start(Number(value('--port') ?? process.env.SCX_MCP_PORT ?? 32180))
  console.error(`SuperConnectX MCP listening at ${server.endpoint}`)
  process.once('SIGINT', () => void server.close().then(() => process.exit(0)))
} else {
  await startMcpStdio(resolvedFacade, policy)
}
