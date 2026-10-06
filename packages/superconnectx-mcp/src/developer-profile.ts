import { access, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { z } from 'zod'
import { templateSchema, type TemplateRegistry } from './templates.js'

const componentSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/),
  type: z.enum(['template-dir', 'resource-dir', 'script-dir', 'parser', 'tool', 'facade']),
  description: z.string().max(500).optional(),
  path: z.string().min(1).max(1000),
  risk: z.enum(['read', 'write', 'destructive', 'export']).default('read')
})

export const developerProfileSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/),
  name: z.string().min(1).max(120),
  version: z.number().int().positive(),
  description: z.string().max(1000).optional(),
  templates: z.array(templateSchema).max(200).default([]),
  components: z.array(componentSchema).max(200).default([])
})

export type DeveloperProfile = z.infer<typeof developerProfileSchema>
export type DeveloperComponent = z.infer<typeof componentSchema>

export interface DeveloperProfileLoadResult {
  profile: DeveloperProfile
  source: string
  loadedTemplates: Array<{ id: string; version: number; source: string }>
  components: Array<{ id: string; type: DeveloperComponent['type']; path: string; risk: DeveloperComponent['risk'] }>
  skipped: Array<{ source: string; reason: string }>
}

export function developerProfilePaths(explicitPath?: string): string[] {
  const paths = [
    explicitPath,
    process.env.SCX_MCP_PROFILE,
    join(process.cwd(), '.superconnectx', 'profile.json'),
    join(homedir(), '.superconnectx', 'profile.json')
  ].filter((value): value is string => Boolean(value))
  return [...new Set(paths.map((value) => resolve(value)))]
}

function resolveFrom(baseFile: string, value: string): string {
  const expanded = value.startsWith('~/') ? join(homedir(), value.slice(2)) : value
  return isAbsolute(expanded) ? expanded : resolve(baseFile, '..', expanded)
}
export async function loadDeveloperProfile(
  registry: TemplateRegistry,
  explicitPath?: string
): Promise<DeveloperProfileLoadResult | null> {
  const source = await firstExisting(developerProfilePaths(explicitPath))
  if (!source) return null
  const profile = developerProfileSchema.parse(JSON.parse(await readFile(source, 'utf8')))
  const result: DeveloperProfileLoadResult = { profile, source, loadedTemplates: [], components: [], skipped: [] }

  for (const template of profile.templates) {
    try {
      registry.register(template)
      result.loadedTemplates.push({ id: template.id, version: template.version, source })
    } catch (error) {
      result.skipped.push({ source: `${source}#${template.id}`, reason: errorMessage(error) })
    }
  }

  for (const component of profile.components) {
    const componentPath = resolveFrom(source, component.path)
    if (component.type === 'template-dir') {
      const loaded = await registry.loadDirectory(componentPath)
      result.loadedTemplates.push(...loaded.loaded.map((item) => ({ id: item.id, version: item.version, source: item.file })))
      result.skipped.push(...loaded.skipped.map((item) => ({ source: item.file, reason: item.reason })))
      continue
    }
    try {
      await access(componentPath)
      result.components.push({ id: component.id, type: component.type, path: componentPath, risk: component.risk })
    } catch (error) {
      result.skipped.push({ source: componentPath, reason: errorMessage(error) })
    }
  }
  return result
}

export function facadeComponent(result: DeveloperProfileLoadResult | null, explicitFacade?: string): string | undefined {
  if (explicitFacade) return explicitFacade
  const component = result?.profile.components.find((item) => item.type === 'facade')
  return component && result ? resolveFrom(result.source, component.path) : undefined
}

async function firstExisting(paths: string[]): Promise<string | undefined> {
  for (const path of paths) {
    try {
      await access(path)
      return path
    } catch {
      // try next
    }
  }
  return undefined
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
