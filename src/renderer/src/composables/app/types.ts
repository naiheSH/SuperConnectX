/**
 * Composables 共享类型定义
 */

export interface ComTerminalRef {
  isConnected?: boolean
  reconnect?: () => void
  preventAutoReconnect?: () => void
  disconnect?: () => void
  cleanup?: () => void
  clearTerminal?: () => void
  getFontFamily?: () => string
  getRemark?: () => string
  updateRemark?: (remark: string) => Promise<void>
  handleFontChange?: (fontFamily: string) => void
  handleFontSizeChange?: (action: string) => void
  refreshGroupsCmds?: () => void
  setWordWrap?: (value: boolean) => void
  setLineNumbers?: (value: boolean) => void
  setLogEditable?: (value: boolean) => void
  [key: string]: any
}

export interface TelnetTerminalRef {
  isConnected?: boolean
  reconnect?: () => void
  preventAutoReconnect?: () => void
  disconnect?: () => void
  cleanup?: () => void
  clearTerminal?: () => void
  getFontFamily?: () => string
  handleFontChange?: (fontFamily: string) => void
  handleFontSizeChange?: (action: string) => void
  refreshGroupsCmds?: () => void
  setWordWrap?: (value: boolean) => void
  setLineNumbers?: (value: boolean) => void
  setLogEditable?: (value: boolean) => void
  [key: string]: any
}
