<template>
  <FeatureTelnetTerminal ref="terminalRef" v-bind="$props" v-on="$attrs" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import FeatureTelnetTerminal from '../features/terminal/TelnetTerminal.vue'

defineProps<{
  connection: {
    id: string | number
    connectionType: string
    host?: string
    port?: number
    name?: string
    sessionId: string | number
    ftpMode?: string
    encoding?: string
  }
  onClose?: () => void
  autoConnect?: boolean
  showBottomPanel?: boolean
}>()

const terminalRef = ref<InstanceType<typeof FeatureTelnetTerminal> | null>(null)
const isConnected = computed(() => terminalRef.value?.isConnected ?? false)

defineExpose({
  refreshGroupsCmds: () => terminalRef.value?.refreshGroupsCmds(),
  handleFontChange: (font: string) => terminalRef.value?.handleFontChange(font),
  isConnected,
  disconnect: () => terminalRef.value?.disconnect(),
  reconnect: () => terminalRef.value?.reconnect(),
  cleanup: () => terminalRef.value?.cleanup(),
  preventAutoReconnect: () => terminalRef.value?.preventAutoReconnect(),
  getFontFamily: () => terminalRef.value?.getFontFamily(),
  clearTerminal: () => terminalRef.value?.clearTerminal(),
  setWordWrap: (value: boolean) => terminalRef.value?.setWordWrap(value),
  setLineNumbers: (value: boolean) => terminalRef.value?.setLineNumbers(value),
  setLogEditable: (value: boolean) => terminalRef.value?.setLogEditable(value)
})
</script>
