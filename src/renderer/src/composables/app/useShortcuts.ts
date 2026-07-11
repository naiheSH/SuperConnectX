/**
 * useShortcuts - 快捷键管理
 * 管理：快捷键配置加载、事件处理、命令映射
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

export interface ShortcutActionMap {
  openCreateDialog: () => void
  closeSingleTab: (tab: any) => void
  toggleConnectionList: () => void
  loadSerialPorts: () => Promise<void>
  openCommandEditorTab: (connectionType?: string) => void
  openSettingsTab: () => void
  togglePinTab: () => void
  moveTabToFirst: () => void
  moveTabToLast: () => void
  openSettingsAndSwitchToSyntax: () => void
}

export function useShortcuts(
  actionMap: ShortcutActionMap,
  connectionTabs: any,
  activeTabId: any,
  hasAnyConnected: any,
  comTerminalRefs: any,
  telnetTerminalRefs: any,
  rightClickedTab: any,
  disconnectAllTabs: () => void,
  connectAllTabs: () => void,
  switchTabById: (id: string | number) => void,
  togglePinTab: () => void,
  moveTabToFirst: () => void,
  moveTabToLast: () => void
) {
  const { t } = useI18n()
  const shortcuts = ref<Array<{ action: string; keys: string[] }>>([])
  const shortcutActions = ref<Record<string, () => void>>({})

  const normalizeShortcutKey = (key: string): string => {
    const upperKey = key.toUpperCase()
    if (['CONTROL', 'CMD', 'COMMAND', 'COMMANDORCONTROL', 'SUPER', 'HYPER'].includes(upperKey)) {
      return 'Ctrl'
    }
    return key
  }

  const normalizeEventKey = (e: KeyboardEvent): string[] => {
    const keys: string[] = []
    if (e.ctrlKey) keys.push('Ctrl')
    if (e.altKey) keys.push('Alt')
    if (e.shiftKey) keys.push('Shift')
    if (e.metaKey) keys.push('Meta')
    const key = e.key
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      let normalizedKey = key
      if (key === ' ') normalizedKey = 'Space'
      else if (key.length === 1) normalizedKey = key.toUpperCase()
      keys.push(normalizedKey)
    }
    return keys
  }

  const handleShortcutKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
    if (document.querySelector('.el-dialog__wrapper')) return

    const pressedKeys = normalizeEventKey(e)
    for (const shortcut of shortcuts.value) {
      if (!shortcut.keys || shortcut.keys.length === 0) continue
      const shortcutKeys = shortcut.keys.map(k => normalizeShortcutKey(k))
      if (pressedKeys.length === shortcutKeys.length &&
          pressedKeys.every(k => shortcutKeys.includes(k))) {
        const action = shortcutActions.value[shortcut.action]
        if (action) { e.preventDefault(); action(); return }
      }
    }
  }

  const loadShortcutActions = async () => {
    try {
      const actions = await window.storageApi.getShortcutActions()
      if (actions && typeof actions === 'object') {
        shortcutActions.value = {
          'Tab:newConnection': () => actionMap.openCreateDialog(),
          'Tab:close': () => {
            if (activeTabId.value) {
              actionMap.closeSingleTab(
                connectionTabs.value.find((t: any) => t.id.toString() === activeTabId.value) || { id: activeTabId.value }
              )
            }
          },
          'Tab:toggleConnection': () => {
            if (activeTabId.value) {
              const tab = connectionTabs.value.find((t: any) => t.id.toString() === activeTabId.value)
              if (tab) {
                const isConnected = tab.connectionType === 'com'
                  ? comTerminalRefs[tab.id]?.isConnected
                  : telnetTerminalRefs[tab.id]?.isConnected
                if (isConnected) {
                  if (tab.connectionType === 'com') {
                    comTerminalRefs[tab.id]?.preventAutoReconnect?.()
                    comTerminalRefs[tab.id]?.disconnect?.()
                  } else {
                    telnetTerminalRefs[tab.id]?.preventAutoReconnect?.()
                    telnetTerminalRefs[tab.id]?.disconnect?.()
                  }
                } else {
                  if (tab.connectionType === 'com') {
                    comTerminalRefs[tab.id]?.reconnect?.()
                  } else {
                    telnetTerminalRefs[tab.id]?.reconnect?.()
                  }
                }
              }
            }
          },
          'Tab:toggleAllConnections': () => {
            if (hasAnyConnected.value) { disconnectAllTabs() } else { connectAllTabs() }
          },
          'Terminal:clear': () => {
            if (activeTabId.value) {
              const tabId = activeTabId.value
              if (comTerminalRefs[tabId]) {
                comTerminalRefs[tabId]?.clearTerminal?.()
              } else if (telnetTerminalRefs[tabId]) {
                telnetTerminalRefs[tabId]?.clearTerminal?.()
              }
            }
          },
          'Tab:pinCurrent': () => {
            if (activeTabId.value) {
              const tab = connectionTabs.value.find((t: any) => t.id.toString() === activeTabId.value)
              if (tab) { rightClickedTab.value = tab; togglePinTab() }
            }
          },
          'Tab:prev': () => {
            if (connectionTabs.value.length === 0) return
            const currentIndex = connectionTabs.value.findIndex((t: any) => t.id.toString() === activeTabId.value)
            const prevIndex = currentIndex <= 0 ? connectionTabs.value.length - 1 : currentIndex - 1
            switchTabById(connectionTabs.value[prevIndex].id)
          },
          'Tab:next': () => {
            if (connectionTabs.value.length === 0) return
            const currentIndex = connectionTabs.value.findIndex((t: any) => t.id.toString() === activeTabId.value)
            const nextIndex = currentIndex >= connectionTabs.value.length - 1 ? 0 : currentIndex + 1
            switchTabById(connectionTabs.value[nextIndex].id)
          },
          'Tab:moveFirst': () => {
            if (activeTabId.value) {
              const tab = connectionTabs.value.find((t: any) => t.id.toString() === activeTabId.value)
              if (tab) { rightClickedTab.value = tab; moveTabToFirst() }
            }
          },
          'Tab:moveLast': () => {
            if (activeTabId.value) {
              const tab = connectionTabs.value.find((t: any) => t.id.toString() === activeTabId.value)
              if (tab) { rightClickedTab.value = tab; moveTabToLast() }
            }
          },
          'CommandEditor:open': () => {
            if (!activeTabId.value) return
            const activeTab = connectionTabs.value.find((t: any) => t.id.toString() === activeTabId.value)
            if (!activeTab || !['com', 'telnet', 'ftp'].includes(activeTab.connectionType)) return
            const connectionType = activeTab.connectionType === 'com' ? 'telnet' : activeTab.connectionType
            actionMap.openCommandEditorTab(connectionType)
          },
          'ConnectionList:toggle': () => actionMap.toggleConnectionList(),
          'SerialPort:refresh': () => actionMap.loadSerialPorts(),
          'Window:toggleFullscreen': () => window.windowApi.toggleFullscreenWindow(),
        }
      }
    } catch (error) {
      console.error(t('shortcuts.loadFailed'), error)
    }
  }

  const loadShortcuts = async () => {
    try {
      const data = await window.storageApi.getShortcuts()
      if (Array.isArray(data) && data.length > 0) {
        shortcuts.value = data
      }
    } catch (error) {
      console.error(t('shortcuts.loadFailed'), error)
    }
  }

  const handleShortcutsUpdated = async () => {
    await loadShortcuts()
  }

  return {
    shortcuts,
    shortcutActions,
    handleShortcutKeydown,
    loadShortcutActions,
    loadShortcuts,
    handleShortcutsUpdated
  }
}
