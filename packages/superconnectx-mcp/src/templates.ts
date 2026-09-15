import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import type { DeviceTemplate } from './types.js'

const commandSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  text: z.string().max(4096),
  lineEnding: z.enum(['none', 'LF', 'CR', 'CRLF']).optional(),
  risk: z.enum(['read', 'write', 'destructive', 'export']),
  wait: z
    .object({
      type: z.enum(['literal', 'regex']),
      pattern: z.string().min(1).max(512),
      timeoutMs: z.number().int().min(1).max(120_000)
    })
    .optional()
})

export const templateSchema = z.object({
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
  logEvents: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        level: z.enum(['info', 'warning', 'error']),
        pattern: z.string().min(1).max(512),
        summary: z.string().min(1).max(500)
      })
    )
    .max(200)
})

export interface TemplateLoadResult {
  loaded: Array<{ file: string; id: string; version: number }>
  skipped: Array<{ file: string; reason: string }>
}

export class TemplateRegistry {
  private readonly items = new Map<string, DeviceTemplate>()

  register(value: unknown): DeviceTemplate {
    const template = templateSchema.parse(value)
    const current = this.items.get(template.id)
    if (current && template.version < current.version) {
      throw new Error(`Template version must not decrease: ${template.id}`)
    }
    this.items.set(template.id, template)
    return template
  }

  async loadDirectory(directory: string): Promise<TemplateLoadResult> {
    const result: TemplateLoadResult = { loaded: [], skipped: [] }
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return result
      throw error
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) continue
      const file = join(directory, entry.name)
      try {
        const template = this.register(JSON.parse(await readFile(file, 'utf8')))
        result.loaded.push({ file, id: template.id, version: template.version })
      } catch (error) {
        result.skipped.push({ file, reason: error instanceof Error ? error.message : String(error) })
      }
    }
    return result
  }

  list(): Array<Pick<DeviceTemplate, 'id' | 'version' | 'name' | 'description'>> {
    return [...this.items.values()].map(({ id, version, name, description }) => ({
      id,
      version,
      name,
      description
    }))
  }

  get(id: string): DeviceTemplate | undefined {
    return this.items.get(id)
  }
}
