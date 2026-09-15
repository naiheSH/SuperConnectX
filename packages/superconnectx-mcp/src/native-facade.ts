import { SerialPort } from 'serialport'
import type { McpFacade, SerialPortInfo, SessionSummary, LogTailResult } from './types.js'
import type { TemplateRegistry } from './templates.js'

type NativeSession = { port: SerialPort; lines: string[]; state: SessionSummary['state']; info: SessionSummary }

export class NativeMcpFacade implements McpFacade {
  private readonly sessions = new Map<string, NativeSession>()
  constructor(private readonly templates?: TemplateRegistry) {}
  async listTemplates() { return this.templates?.list() ?? [] }
  async getTemplate(id: string) { return this.templates?.get(id) }
  async listSerialPorts(): Promise<SerialPortInfo[]> {
    return (await SerialPort.list()).map((port) => ({ path: port.path, manufacturer: port.manufacturer, serialNumber: port.serialNumber, vendorId: port.vendorId, productId: port.productId }))
  }
  async listSessions(): Promise<SessionSummary[]> { return [...this.sessions.values()].map(({ info }) => info) }
  async readSession(sessionId: string, options: { maxLines?: number } = {}) {
    const session = this.require(sessionId); const maxLines = Math.min(options.maxLines ?? 100000, 100000)
    return { sessionId, lines: session.lines.slice(-maxLines), truncated: session.lines.length > maxLines }
  }
  async readLogTail(sessionId: string, options: { maxLines?: number } = {}): Promise<LogTailResult> { const data = await this.readSession(sessionId, options); return { ...data, nextOffset: this.require(sessionId).lines.length } }
  async startSessionPort(port: string, baudRate = 115200, ownerId = 'cli') {
    if ([...this.sessions.values()].some((session) => session.info.endpoint === port)) throw new Error(`Session already exists for ${port}`)
    const sessionId = `cli-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const serial = new SerialPort({ path: port, baudRate, autoOpen: false }); const info: SessionSummary = { sessionId, connectionType: 'serial', name: port, endpoint: port, owner: 'ai', state: 'connecting' }
    const session: NativeSession = { port: serial, lines: [], state: 'connecting', info }; this.sessions.set(sessionId, session)
    serial.on('data', (chunk: Buffer) => { session.lines.push(...chunk.toString('utf8').split(/\r?\n/).filter(Boolean)); if (session.lines.length > 100000) session.lines.splice(0, session.lines.length - 100000) })
    await new Promise<void>((resolve, reject) => serial.open((error) => error ? reject(error) : resolve()))
    session.state = 'connected'; info.state = 'connected'; return { sessionId, ownerId, port }
  }
  async sendSession(sessionId: string, command: string) { const session = this.require(sessionId); await new Promise<void>((resolve, reject) => session.port.write(command, (error) => error ? reject(error) : resolve())); return { success: true, sessionId } }
  async stopSession(sessionId: string) { const session = this.require(sessionId); await new Promise<void>((resolve) => session.port.close(() => resolve())); session.info.state = 'closed'; this.sessions.delete(sessionId); return { success: true, sessionId } }
  async acquireWriteLease(sessionId: string, ownerId: string) { this.require(sessionId); return { sessionId, ownerId, expiresAt: Date.now() + 300000 } }
  async releaseWriteLease() {}
  assertWriteLease(sessionId: string) { this.require(sessionId) }
  private require(sessionId: string) { const session = this.sessions.get(sessionId); if (!session) throw new Error(`Session not found: ${sessionId}`); return session }
}
