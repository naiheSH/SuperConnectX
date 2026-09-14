import { describe, expect, it, vi } from 'vitest'
import SuperConnectXMcpFacade from '../../src/main/mcp/SuperConnectXMcpFacade'

vi.mock('../../src/main/ipc/IpcSerialPort', () => ({
  default: { getInstance: () => ({ listSerialPorts: vi.fn(async () => [{ path: 'COM3' }]) }) }
}))

vi.mock('../../src/main/ipc/IpcConnector', () => ({
  default: {
    getInstance: () => ({
      listMcpSessions: () => [{ sessionId: 's1', connectionType: 'com', owner: 'user', state: 'connected' }],
      getMcpLogFilePath: vi.fn(async () => ({ success: false, message: 'missing' }))
    })
  }
}))

describe('SuperConnectXMcpFacade', () => {
  it('reads current serial ports and sessions through existing host services', async () => {
    const facade = new SuperConnectXMcpFacade()
    await expect(facade.listSerialPorts()).resolves.toEqual([{ path: 'COM3' }])
    await expect(facade.listSessions()).resolves.toEqual([
      { sessionId: 's1', connectionType: 'com', owner: 'user', state: 'connected' }
    ])
  })

  it('returns a bounded missing-log error', async () => {
    const facade = new SuperConnectXMcpFacade()
    await expect(facade.readLogTail('missing')).rejects.toThrow('missing')
  })
})
