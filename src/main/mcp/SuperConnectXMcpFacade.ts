import fs from 'fs/promises'
import path from 'path'
import IpcConnector from '../ipc/IpcConnector'
import IpcSerialPort from '../ipc/IpcSerialPort'
import type { McpFacade, LogTailResult, SerialPortInfo, SessionSummary } from '../../shared/mcp/McpTypes'

const DEFAULT_MAX_BYTES = 64 * 1024
const DEFAULT_MAX_LINES = 500

export default class SuperConnectXMcpFacade implements McpFacade {
  async listSerialPorts(): Promise<SerialPortInfo[]> {
    return (await IpcSerialPort.getInstance().listSerialPorts(false)) as SerialPortInfo[]
  }

  async listSessions(): Promise<SessionSummary[]> {
    return IpcConnector.getInstance().listMcpSessions()
  }

  async readLogTail(
    sessionId: string,
    options: { maxBytes?: number; maxLines?: number } = {}
  ): Promise<LogTailResult> {
    const maxBytes = Math.min(Math.max(options.maxBytes ?? DEFAULT_MAX_BYTES, 1), 1024 * 1024)
    const maxLines = Math.min(Math.max(options.maxLines ?? DEFAULT_MAX_LINES, 1), 10_000)
    const pathResult = await IpcConnector.getInstance().getMcpLogFilePath(sessionId)
    if (!pathResult.success || !pathResult.filePath) {
      throw new Error(pathResult.message || 'Log file not found')
    }

    const filePath = path.resolve(pathResult.filePath)
    const stat = await fs.stat(filePath)
    const start = Math.max(0, stat.size - maxBytes)
    const handle = await fs.open(filePath, 'r')
    try {
      const buffer = Buffer.alloc(stat.size - start)
      await handle.read(buffer, 0, buffer.length, start)
      const text = buffer.toString('utf8')
      const lines = text.split(/\r?\n/).filter((line) => line.length > 0)
      const limitedLines = lines.slice(-maxLines)
      return {
        sessionId,
        lines: limitedLines,
        truncated: start > 0 || limitedLines.length < lines.length,
        nextOffset: stat.size
      }
    } finally {
      await handle.close()
    }
  }
}
