import { z } from 'zod'
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
}

export { templateSchema }
