#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { startMcpStdio, McpLoopbackServer } from './transports.js'
import type { McpFacade, McpPermissionPolicy } from './types.js'
import { NativeMcpFacade } from './native-facade.js'
import { TemplateRegistry } from './templates.js'
import { createDefaultAuditSink } from './audit.js'

function usage(message?: string): never {
  if (message) console.error(message)
  console.error(
    'Usage: scx-mcp [--facade ./facade.mjs] [--stdio | --http] [--port 32180] [--token TOKEN] [--mode read-only|read-write|full] [--allow-export|--no-export] [--templates DIR] [--doctor] [--print-config]'
  )
  process.exit(2)
}

function parsePolicy(argv: string[]): { mode: 'read-only' | 'read-write' | 'full'; policy: McpPermissionPolicy } {
  const value = (name: string) => {
    const index = argv.indexOf(name)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const mode = (value('--mode') ?? 'full') as 'read-only' | 'read-write' | 'full'
  if (!['read-only', 'read-write', 'full'].includes(mode)) usage(`Invalid --mode: ${mode}`)
  return {
    mode,
    policy: {
      read: true,
      write: mode !== 'read-only',
      destructive: mode === 'full',
      export: mode === 'full' && (!argv.includes('--no-export') || argv.includes('--allow-export'))
    }
  }
}

export async function runMcpCli(argv = process.argv.slice(2)): Promise<void> {
  const value = (name: string) => {
    const index = argv.indexOf(name)
    return index >= 0 ? argv[index + 1] : undefined
  }

  if (argv.includes('--help') || argv.includes('-h')) usage()
  if (argv.includes('--version')) {
    console.log('0.1.0')
    return
  }

  const { mode, policy } = parsePolicy(argv)
  const registry = new TemplateRegistry()
  const defaultTemplates = join(homedir(), '.superconnectx', 'templates')
  const templateDirectory = value('--templates') ?? process.env.SCX_MCP_TEMPLATES ?? defaultTemplates
  const templateResult = await registry.loadDirectory(templateDirectory)
  const facadePath = value('--facade') ?? process.env.SCX_MCP_FACADE_MODULE

  if (argv.includes('--doctor')) {
    const probe = new NativeMcpFacade(registry)
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode,
          templateDirectory,
          templates: templateResult.loaded.length,
          skippedTemplates: templateResult.skipped,
          serialPorts: await probe.listSerialPorts(),
          facade: facadePath ?? 'native'
        },
        null,
        2
      )
    )
    return
  }

  if (argv.includes('--print-config')) {
    const command = ['scx-mcp', '--stdio', '--mode', mode]
    if (argv.includes('--no-export')) command.push('--no-export')
    if (argv.includes('--allow-export')) command.push('--allow-export')
    if (facadePath) command.push('--facade', facadePath)
    if (templateDirectory !== defaultTemplates) command.push('--templates', templateDirectory)
    console.log(
      JSON.stringify(
        {
          mcpServers: {
            superconnectx: {
              command: command[0],
              args: command.slice(1)
            }
          }
        },
        null,
        2
      )
    )
    return
  }

  let resolvedFacade: McpFacade
  if (facadePath) {
    const imported = await import(pathToFileURL(facadePath).href)
    resolvedFacade = (imported.default ?? imported.facade) as McpFacade
  } else {
    resolvedFacade = new NativeMcpFacade(registry)
  }
  if (!resolvedFacade || typeof resolvedFacade.listSerialPorts !== 'function') {
    throw new Error('Facade module must export default or facade implementing McpFacade')
  }

  const audit = createDefaultAuditSink()

  if (argv.includes('--http')) {
    const server = new McpLoopbackServer(
      resolvedFacade,
      value('--token') ?? process.env.SCX_MCP_TOKEN,
      policy,
      audit
    )
    await server.start(Number(value('--port') ?? process.env.SCX_MCP_PORT ?? 32180))
    console.error(`SuperConnectX MCP listening at ${server.endpoint}`)
    await new Promise<void>((resolve) => {
      process.once('SIGINT', () => {
        void server.close().then(() => resolve())
      })
    })
    return
  }

  await startMcpStdio(resolvedFacade, policy, audit)
}

const isDirectExecution =
  process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectExecution) {
  runMcpCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
