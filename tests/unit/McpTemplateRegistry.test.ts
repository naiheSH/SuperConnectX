import { describe, expect, it } from 'vitest'
import { McpTemplateRegistry } from '../../src/main/mcp/McpTemplateRegistry'

const template = {
  id: 'gw01',
  version: 1,
  name: 'GW01',
  connectionTypes: ['serial'],
  permissions: { defaultMode: 'read-only', allowWrite: false },
  commands: [{ id: 'version', label: '版本', text: 'AT+VERSION', risk: 'read' }],
  logEvents: [{ id: 'reboot', level: 'warning', pattern: 'watchdog', summary: '看门狗复位' }]
}

describe('McpTemplateRegistry', () => {
  it('registers, lists and retrieves validated templates', () => {
    const registry = new McpTemplateRegistry()
    registry.register(template)
    expect(registry.list()).toEqual([{ id: 'gw01', version: 1, name: 'GW01' }])
    expect(registry.get('gw01')?.commands[0].text).toBe('AT+VERSION')
  })

  it('rejects a version downgrade', () => {
    const registry = new McpTemplateRegistry()
    registry.register(template)
    expect(() => registry.register({ ...template, version: 0 })).toThrow()
  })

  it('rejects executable-looking invalid template identifiers', () => {
    const registry = new McpTemplateRegistry()
    expect(() => registry.register({ ...template, id: '../evil' })).toThrow()
  })
})
