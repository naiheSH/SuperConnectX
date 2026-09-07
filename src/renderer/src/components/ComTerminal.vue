<template>
  <FeatureComTerminal ref="terminalRef" v-bind="$props" v-on="$attrs" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import FeatureComTerminal from '../features/terminal/ComTerminal.vue'

defineProps<{
  connection: {
    id: string | number
    connectionType: string
    comName?: string
    baudRate?: number
    dataBits?: number
    stopBits?: number
    parity?: string
    name?: string
    host?: string
    port?: number
    username?: string
    password?: string
    sessionId: string | number
    remark?: string
  }
  autoConnect?: boolean
  showBottomPanel?: boolean
  onClose?: () => void
}>()

const terminalRef = ref<InstanceType<typeof FeatureComTerminal> | null>(null)
const isConnected = computed(() => terminalRef.value?.isConnected ?? false)

defineExpose({
  refreshGroupsCmds: () => terminalRef.value?.refreshGroupsCmds(),
  reconnect: () => terminalRef.value?.reconnect(),
  disconnect: () => terminalRef.value?.disconnect(),
  isConnected,
  preventAutoReconnect: () => terminalRef.value?.preventAutoReconnect(),
  getRemark: () => terminalRef.value?.getRemark(),
  updateRemark: (remark: string) => terminalRef.value?.updateRemark(remark),
  handleFontChange: (font: string) => terminalRef.value?.handleFontChange(font),
  getFontFamily: () => terminalRef.value?.getFontFamily(),
  clearTerminal: () => terminalRef.value?.clearTerminal(),
  setWordWrap: (value: boolean) => terminalRef.value?.setWordWrap(value),
  setLineNumbers: (value: boolean) => terminalRef.value?.setLineNumbers(value),
  setLogEditable: (value: boolean) => terminalRef.value?.setLogEditable(value)
})
</script>
