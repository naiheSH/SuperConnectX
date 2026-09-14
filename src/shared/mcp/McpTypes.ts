export type McpPermission = 'read' | 'write' | 'destructive' | 'export'

export interface SerialPortInfo {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  locationId?: string
  friendlyName?: string
  vendorId?: string
  productId?: string
}

export interface SessionSummary {
  sessionId: string
  connectionType: string
  name?: string
  endpoint?: string
  owner: 'user' | 'ai'
  state: 'connecting' | 'connected' | 'closing' | 'closed'
}

export interface LogTailResult {
  sessionId: string
  lines: string[]
  truncated: boolean
  nextOffset?: number
}

export interface McpFacade {
  listSerialPorts(): Promise<SerialPortInfo[]>
  listSessions(): Promise<SessionSummary[]>
  readLogTail(sessionId: string, options?: { maxBytes?: number; maxLines?: number }): Promise<LogTailResult>
}
