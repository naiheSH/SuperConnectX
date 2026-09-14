import { z } from 'zod'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { McpDeviceTemplate } from '../../shared/mcp/McpTemplateTypes'

const commandSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  text: z.string().max(4096),
  lineEnding: z.enum(['none', 'LF', 'CR', 'CRLF']).optional(),
  risk: z.enum(['read', 'write', 'destructive', 'export']),
  wait: z.object({
    type: z.enum(['literal', 'regex']),
    pattern: z.string().min(1).max(512),
    timeoutMs: z.number().int().min(1).max(120_000)
  }).optional()
})

const templateSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/),
  version: z.number().int().positive(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  connectionTypes: z.array(z.enum(['serial', 'telnet', 'ftp'])).min(1),
  permissions: z.object({
    defaultMode: z.enum(['read-only', 'read-write']),
    allowWrite: z.boolean()
  }),
  commands: z.array(commandSchema).max(200),
  logEvents: z.array(z.object({
    id: z.string().min(1).max(80),
    level: z.enum(['info', 'warning', 'error']),
    pattern: z.string().min(1).max(512),
    summary: z.string().min(1).max(500)
  })).max(200)
})

export class McpTemplateRegistry {
  private readonly templates = new Map<string, McpDeviceTemplate>()

  register(template: unknown): McpDeviceTemplate {
    const parsed = templateSchema.parse(template)
    const existing = this.templates.get(parsed.id)
    if (existing && parsed.version < existing.version) {
      throw new Error(`Template version must not decrease: ${parsed.id}`)
    }
    this.templates.set(parsed.id, parsed)
    return parsed
  }

  list(): Array<Pick<McpDeviceTemplate, 'id' | 'version' | 'name' | 'description'>> {
    return Array.from(this.templates.values(), ({ id, version, name, description }) => ({ id, version, name, description }))
  }

  get(id: string): McpDeviceTemplate | undefined {
    return this.templates.get(id)
  }

  async loadDirectory(directory: string): Promise<TemplateLoadResult> {
    const result: TemplateLoadResult = { loaded: [], skipped: [] }
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (isMissingDirectory(error)) return result
      throw error
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) continue
      const filePath = join(directory, entry.name)
      try {
        const template = this.register(JSON.parse(await readFile(filePath, 'utf8')))
        result.loaded.push({ file: filePath, id: template.id, version: template.version })
      } catch (error) {
        result.skipped.push({ file: filePath, reason: error instanceof Error ? error.message : String(error) })
      }
    }
    return result
  }
}

export interface TemplateLoadResult {
  loaded: Array<{ file: string; id: string; version: number }>
  skipped: Array<{ file: string; reason: string }>
}

function isMissingDirectory(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

export { templateSchema }
