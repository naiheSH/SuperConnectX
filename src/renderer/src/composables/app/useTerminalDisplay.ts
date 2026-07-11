/**
 * useTerminalDisplay - 终端显示设置
 * 管理：换行、行号、日志可编辑
 */
import { ref } from 'vue'

export function useTerminalDisplay() {
  const terminalWordWrap = ref(false)
  const terminalLineNumbers = ref(true)
  const terminalLogEditable = ref(false)

  const loadTerminalDisplaySettings = async () => {
    try {
      const appSettings = await window.storageApi.getAppSettings()
      if (appSettings?.terminalWordWrap !== undefined) {
        terminalWordWrap.value = appSettings.terminalWordWrap
      }
      if (appSettings?.terminalLineNumbers !== undefined) {
        terminalLineNumbers.value = appSettings.terminalLineNumbers
      }
      if (appSettings?.terminalLogEditable !== undefined) {
        terminalLogEditable.value = appSettings.terminalLogEditable
      }
    } catch { /* ignore */ }
  }

  const saveTerminalDisplaySettings = async () => {
    try {
      const currentSettings = await window.storageApi.getAppSettings()
      await window.storageApi.saveAppSettings({
        ...currentSettings,
        terminalWordWrap: terminalWordWrap.value,
        terminalLineNumbers: terminalLineNumbers.value,
        terminalLogEditable: terminalLogEditable.value
      })
    } catch { /* ignore */ }
  }

  const applyToAllTerminals = (
    connectionTabs: any[],
    comTerminalRefs: Record<string, any>,
    telnetTerminalRefs: Record<string, any>,
    method: string,
    value: boolean
  ) => {
    for (const tab of connectionTabs) {
      const tabId = tab.id.toString()
      if (comTerminalRefs[tabId]) {
        comTerminalRefs[tabId]?.[method]?.(value)
      } else if (telnetTerminalRefs[tabId]) {
        telnetTerminalRefs[tabId]?.[method]?.(value)
      }
    }
  }

  const applyTerminalDisplaySettingsToTab = (
    tabId: string,
    comTerminalRefs: Record<string, any>,
    telnetTerminalRefs: Record<string, any>
  ) => {
    const ref = comTerminalRefs[tabId] || telnetTerminalRefs[tabId]
    if (ref) {
      ref.setWordWrap?.(terminalWordWrap.value)
      ref.setLineNumbers?.(terminalLineNumbers.value)
      ref.setLogEditable?.(terminalLogEditable.value)
    }
  }

  return {
    terminalWordWrap,
    terminalLineNumbers,
    terminalLogEditable,
    loadTerminalDisplaySettings,
    saveTerminalDisplaySettings,
    applyToAllTerminals,
    applyTerminalDisplaySettingsToTab
  }
}
