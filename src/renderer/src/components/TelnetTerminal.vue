<template>
  <div class="telnet-terminal">
    <UnifiedTerminal
      ref="unifiedTerminalRef"
      :connection="connection"
      :is-connected="isConnected"
      :is-connecting="isConnecting"
      :init-message="`try to connect ${connection.host}:${connection.port}`"
      placeholder="输入命令并按回车..."
      session-id-prefix="telnet"
      @on-close="handleClose"
      @on-reconnect="handleReconnect"
      @on-open-log="openLogFile"
      @on-save-log="saveLogFile"
      @on-send="handleSend"
      @on-command-sent="handleCommandSent"
      @on-open-command-editor="emit('openCommandEditor', connection.connectionType)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import UnifiedTerminal from './UnifiedTerminal.vue'
import TelnetInfo from '../entity/protocol/TelnetInfo'
import * as monaco from 'monaco-editor'

const MAX_RETRY_COUNT = 1000
const RETRY_INTERVAL_MS = 3000

const emit = defineEmits(['onClose', 'commandSent', 'openCommandEditor', 'fontLoaded'])
const props = defineProps<{
  connection: {
    id: number
    connectionType: string
    host: string
    port: number
    name?: string
    sessionId: string
  }
  onClose?: () => void
}>()

const isConnected = ref(true)
const isConnecting = ref(false)
const showTimestamp = ref(true) // 是否显示时间戳
const fontSize = ref(14) // 字体大小
const fontFamily = ref('Fira Code') // 字体系列
let currentConnId = 0
let removeDataListener: (() => void) | null = null
let removeCloseListener: (() => void) | null = null

let retryCount = 0
let retryTimer: NodeJS.Timeout | null = null
let stopRetry = ref(false)
let preventAutoReconnect = false // 主动断开时禁止自动重连
let allRecvSize = 0
let totalTxSize = 0
void retryCount // suppress unused warning

const unifiedTerminalRef = ref<InstanceType<typeof UnifiedTerminal>>()

// 暴露给父组件的连接状态
const isConnectedValue = computed(() => isConnected.value)

// 统一监听 UnifiedTerminal 的状态变化
watch([
  () => unifiedTerminalRef.value?.getShowTimestamp?.(),
  () => unifiedTerminalRef.value?.getFontSize?.(),
  () => unifiedTerminalRef.value?.getFontFamily?.()
], ([newTimestamp, newFontSize, newFontFamily], [oldTimestamp, oldFontSize, oldFontFamily]) => {
  // showTimestamp 变化
  if (newTimestamp !== undefined && newTimestamp !== showTimestamp.value) {
    showTimestamp.value = newTimestamp
    notifyLogTimestampToBackend(newTimestamp)
  }
  // fontSize 变化
  if (newFontSize !== undefined && newFontSize !== fontSize.value) {
    fontSize.value = newFontSize
  }
  // fontFamily 变化
  if (newFontFamily !== undefined && newFontFamily !== fontFamily.value) {
    fontFamily.value = newFontFamily
  }
}, { immediate: true })

// 监听 showTimestamp、fontSize 和 fontFamily 变化，保存设置
watch([showTimestamp, fontSize, fontFamily], () => {
  saveFontSettings()
})

// 通知后端更新日志时间戳配置
const notifyLogTimestampToBackend = async (showTs: boolean) => {
  if (!isConnected.value) return
  try {
    await window.connectApi.updateConnect(
      {
        connectionType: 'telnet',
        host: props.connection.host,
        port: props.connection.port,
        sessionId: props.connection.sessionId
      },
      {
        logTimestamp: showTs
      }
    )
  } catch (error) {
    console.error('更新日志时间戳配置失败:', error)
  }
}

// 获取原始 connection id（connection.id 格式为 "原始id-sessionId"）
const getOriginalConnectionId = (): number | undefined => {
  const id = props.connection.id
  if (!id) return undefined
  // 格式: "原始id-sessionId"，如 "2-1778933529554"
  const parts = id.toString().split('-')
  return parts.length >= 1 ? parseInt(parts[0], 10) : undefined
}

// 加载连接字体设置
const loadFontSettings = async () => {
  try {
    const originalId = getOriginalConnectionId()
    if (originalId) {
      const connections = await window.storageApi.getConnections()
      const conn = connections.find((c: any) => c.id === originalId)
      if (conn) {
        if (conn.fontSize !== undefined) {
          fontSize.value = conn.fontSize
          unifiedTerminalRef.value?.setFontSize?.(conn.fontSize)
        }
        if (conn.fontFamily !== undefined) {
          fontFamily.value = conn.fontFamily
          unifiedTerminalRef.value?.setFontFamily?.(conn.fontFamily)
          // 字体设置完成后通知父组件更新 currentFont
          emit('fontLoaded', conn.fontFamily)
        }
      }
    }
  } catch (error) {
    console.error('加载字体设置失败:', error)
  }
}

// 保存连接字体设置
const saveFontSettings = async () => {
  try {
    const originalId = getOriginalConnectionId()
    if (originalId) {
      await window.storageApi.updateConnection({
        id: originalId,
        fontSize: fontSize.value,
        fontFamily: fontFamily.value
      })
    }
  } catch (error) {
    console.error('保存字体设置失败:', error)
  }
}

const openLogFile = async () => {
  try {
    const result = await window.connectApi.openConnectLog(props.connection.sessionId)
    if (!result.success) {
      ElMessage.error(`打开日志失败：${result.message}`)
    }
  } catch (error) {
    ElMessage.error('打开日志失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

const saveLogFile = async () => {
  try {
    const result = await window.dialogApi.saveFileDialog({
      title: '保存日志',
      defaultPath: `telnet_${props.connection.host}_${props.connection.port}_${Date.now()}.log`,
      filters: [{ name: '日志文件', extensions: ['log', 'txt'] }]
    })
    if (result.filePath) {
      const copyResult = await window.connectApi.copyLogFile(props.connection.sessionId, result.filePath)
      if (copyResult.success) {
        ElMessage.success('日志保存成功')
        window.toolApi.showItemInFolder(result.filePath)
      } else {
        ElMessage.error('保存失败：' + (copyResult.message || '未知错误'))
      }
    }
  } catch (error) {
    ElMessage.error('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

const handleClose = async () => {
  stopRetry.value = true
  preventAutoReconnect = true
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }

  if (currentConnId) {
    try {
      await window.connectApi.stopConnect({
        ...TelnetInfo.buildWithValue(props.connection),
        sessionId: props.connection.sessionId
      })
      unifiedTerminalRef.value?.appendToTerminal(`\n连接已手动关闭\n`)
    } catch (error) {
      console.error('关闭连接失败:', error)
      ElMessage.error('关闭连接失败')
    } finally {
      cleanup()
    }
  }
  isConnected.value = false
}

const cleanup = () => {
  if (removeDataListener) {
    removeDataListener()
    removeDataListener = null
  }
  if (removeCloseListener) {
    removeCloseListener()
    removeCloseListener = null
  }
  isConnected.value = false
  currentConnId = 0
  allRecvSize = 0
  totalTxSize = 0
}

const handleReconnect = () => {
  // 重连时清空 rx/tx 统计
  totalTxSize = 0
  allRecvSize = 0
  unifiedTerminalRef.value?.resetRxTx()
  unifiedTerminalRef.value?.appendToTerminal(`\n正在重新连接...\n`)
  connect()
}

const reconnect = () => {
  handleReconnect()
}

const handleTelnetClose = (connId: number) => {
  if (connId === currentConnId) {
    cleanup()
    // 如果是主动禁止重连，则不自动重连
    if (preventAutoReconnect) {
      unifiedTerminalRef.value?.appendToTerminal(`\n连接已关闭\n`)
      return
    }
    ElMessage.info('连接已关闭，将尝试重新连接...')
    unifiedTerminalRef.value?.appendToTerminal(`\n连接已关闭，将在${RETRY_INTERVAL_MS / 1000}秒后尝试重连...\n`)
    if (!stopRetry.value) {
      setTimeout(connect, 1000)
    }
  }
}

const connect = async () => {
  stopRetry.value = false
  retryCount = 0
  isConnected.value = false
  isConnecting.value = true
  currentConnId = 0
  allRecvSize = 0
  totalTxSize = 0

  const attemptConnect = async () => {
    if (stopRetry.value) {
      isConnecting.value = false
      return
    }

    try {
      const result = await window.connectApi.startConnect({
        ...TelnetInfo.buildWithValue(props.connection),
        sessionId: props.connection.sessionId
      })
      if (result.success) {
        cleanup()

        currentConnId = result.connId
        isConnected.value = true
        isConnecting.value = false

        // 加载字体设置
        loadFontSettings()

        // 通知后端初始化日志时间戳配置
        notifyLogTimestampToBackend(showTimestamp.value)

        removeDataListener = window.connectApi.onRecvData((data) => {
          if (data.connId !== currentConnId) return
          allRecvSize += data.data.length
          unifiedTerminalRef.value?.updateRxBytes(data.data.length)
          // 根据 showTimestamp 决定是否显示时间戳
          const prefix = showTimestamp.value && data.timestamp ? `[${data.timestamp}] ` : ''
          const displayText = `${prefix}${data.data}\n`
          unifiedTerminalRef.value?.appendToTerminal(displayText)
          // 日志写入由后端根据 logTimestamp 配置统一处理
        })

        removeCloseListener = window.connectApi.onConnectClose(handleTelnetClose)
        unifiedTerminalRef.value?.appendToTerminal(`\nconnect success, retry count: ${retryCount + 1}\n`)
        retryCount = 0
      } else {
        throw new Error(result.message || '连接失败')
      }
    } catch (error) {
      retryCount++
      const errMsg = (error as Error).message
      unifiedTerminalRef.value?.appendToTerminal(`\nconnect failed: (${retryCount}/${MAX_RETRY_COUNT}): ${errMsg}\n`)

      if (retryCount < MAX_RETRY_COUNT && !stopRetry.value) {
        retryTimer = setTimeout(attemptConnect, RETRY_INTERVAL_MS)
      } else if (retryCount >= MAX_RETRY_COUNT) {
        isConnecting.value = false
        emit('onClose')
        if (typeof props.onClose === 'function') props.onClose()
      }
    }
  }

  await attemptConnect()
}

const handleSend = async (command: string, _originalInput?: string) => {
  if (!command.trim() || !isConnected.value) return

  unifiedTerminalRef.value?.appendToTerminal(`\n[${new Date().toISOString()}] SEND >>>>>>>>>> ${command}\n`)
  totalTxSize += command.length
  unifiedTerminalRef.value?.updateTxBytes(command.length)

  try {
    await window.connectApi.sendData({
      conn: {
        ...TelnetInfo.buildWithValue(props.connection),
        sessionId: props.connection.sessionId
      },
      command: command.trim()
    })
  } catch (error) {
    ElMessage.error('命令发送失败')
    console.error('发送失败:', error)
  }
}

const handleCommandSent = (cmdName: string) => emit('commandSent', cmdName)

const refreshGroupsCmds = () => unifiedTerminalRef.value?.refreshGroupsCmds?.()

const handleFontChange = (font: string) => {
  fontFamily.value = font
  unifiedTerminalRef.value?.setFontFamily?.(font)
}

const handleFontSizeChange = (action: string) => {
  const editor = unifiedTerminalRef.value?.editor as any
  if (editor) {
    const currentSize = editor.getOption?.(monaco.editor.EditorOption.fontSize)
    let newSize = currentSize
    if (action === 'increase') {
      newSize = Math.min(currentSize + 2, 30)
    } else {
      newSize = Math.max(currentSize - 2, 8)
    }
    editor.updateOptions?.({ fontSize: newSize })
  }
}

const refreshLayout = () => {
  ;(unifiedTerminalRef.value?.editor as any)?.layout?.()
}

defineExpose({
  refreshGroupsCmds,
  handleFontChange,
  handleFontSizeChange,
  refreshLayout,
  isConnected: isConnectedValue,
  disconnect: handleClose,
  reconnect,
  preventAutoReconnect: () => { preventAutoReconnect = true },
  getFontFamily: () => {
    // 优先从 UnifiedTerminal 获取实际使用的字体
    const unifiedFont = unifiedTerminalRef.value?.getFontFamily?.()
    return unifiedFont || fontFamily.value
  }
})

onMounted(() => {
  connect()
})

onUnmounted(() => {
  stopRetry.value = true
  if (retryTimer) {
    clearTimeout(retryTimer)
  }

  cleanup()

  if (currentConnId && isConnected.value) {
    window.connectApi
      .stopConnect({
        ...TelnetInfo.buildWithValue(props.connection),
        sessionId: props.connection.sessionId
      })
      .catch((err) => {
        console.error('卸载时断开失败:', err)
      })
  }
})
</script>

<style scoped>
.telnet-terminal {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #fff;
  font-family: 'Fira Code', 'Consolas', monospace;
  border-radius: 0px;
  overflow: hidden;
}
</style>
