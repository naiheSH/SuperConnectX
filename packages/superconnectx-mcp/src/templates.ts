import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DeviceTemplate } from './types.js'

export class TemplateRegistry {
  private readonly items = new Map<string, DeviceTemplate>()
  register(value: unknown): DeviceTemplate {
    const template = value as DeviceTemplate
    if (!template || typeof template.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(template.id)) throw new Error('Invalid template id')
    if (!Number.isInteger(template.version) || template.version < 1 || !template.name) throw new Error(`Invalid template: ${template.id}`)
    const current = this.items.get(template.id)
    if (current && template.version < current.version) throw new Error(`Template version must not decrease: ${template.id}`)
    this.items.set(template.id, template)
    return template
  }
  async loadDirectory(directory: string): Promise<{ loaded: string[]; skipped: Array<{ file: string; reason: string }> }> {
    const loaded: string[] = []; const skipped: Array<{ file: string; reason: string }> = []
    let entries
    try { entries = await readdir(directory, { withFileTypes: true }) } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { loaded, skipped }; throw error }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const file = join(directory, entry.name)
      try { this.register(JSON.parse(await readFile(file, 'utf8'))); loaded.push(file) } catch (error) { skipped.push({ file, reason: error instanceof Error ? error.message : String(error) }) }
    }
    return { loaded, skipped }
  }
  list() { return [...this.items.values()].map(({ id, version, name, description }) => ({ id, version, name, description })) }
  get(id: string) { return this.items.get(id) }
}
