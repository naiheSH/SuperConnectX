<template>
  <FeatureUnifiedTerminal ref="terminalRef" v-bind="$props" v-on="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </FeatureUnifiedTerminal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FeatureUnifiedTerminal from '../features/terminal/UnifiedTerminal.vue'

withDefaults(defineProps<{
  connection: {
    id: string | number
    connectionType: string
    comName?: string
    host?: string
    port?: number
    name?: string
    sessionId: string | number
    [key: string]: any
  }
  isConnected?: boolean
  isConnecting?: boolean
  initMessage?: string
  placeholder?: string
  sessionIdPrefix?: string
  showBottomPanel?: boolean
}>(), {
  isConnected: false,
  isConnecting: false,
  initMessage: '',
  placeholder: '',
  sessionIdPrefix: 'terminal',
  showBottomPanel: true
})

const terminalRef = ref<InstanceType<typeof FeatureUnifiedTerminal> | null>(null)

defineExpose({
  appendToTerminal: (content: string) => terminalRef.value?.appendToTerminal(content),
  updateRxBytes: (length: number) => terminalRef.value?.updateRxBytes(length),
  updateTxBytes: (length: number) => terminalRef.value?.updateTxBytes(length),
  resetRxTx: () => terminalRef.value?.resetRxTx(),
  clearTerminal: () => terminalRef.value?.clearTerminal(),
  scrollToEnd: () => terminalRef.value?.scrollToEnd(),
  scrollToStart: () => terminalRef.value?.scrollToStart(),
  setConnected: (value: boolean) => terminalRef.value?.setConnected(value),
  setConnecting: (value: boolean) => terminalRef.value?.setConnecting(value),
  focusInput: () => terminalRef.value?.focusInput(),
  getEditorContent: () => terminalRef.value?.getEditorContent(),
  refreshGroupsCmds: () => terminalRef.value?.refreshGroupsCmds(),
  setAutoNewline: (value: boolean) => terminalRef.value?.setAutoNewline(value),
  setHexMode: (value: boolean) => terminalRef.value?.setHexMode(value),
  setCrcEnabled: (value: boolean) => terminalRef.value?.setCrcEnabled(value),
  setCrcMethod: (value: string) => terminalRef.value?.setCrcMethod(value),
  setHexDisplayMode: (value: boolean) => terminalRef.value?.setHexDisplayMode(value),
  setShowTimestamp: (value: boolean) => terminalRef.value?.setShowTimestamp(value),
  setCommandInput: (value: string) => terminalRef.value?.setCommandInput(value),
  getAutoNewline: () => terminalRef.value?.getAutoNewline(),
  getHexMode: () => terminalRef.value?.getHexMode(),
  getCrcEnabled: () => terminalRef.value?.getCrcEnabled(),
  getCrcMethod: () => terminalRef.value?.getCrcMethod(),
  getHexDisplayMode: () => terminalRef.value?.getHexDisplayMode(),
  getShowTimestamp: () => terminalRef.value?.getShowTimestamp(),
  getCommandInput: () => terminalRef.value?.getCommandInput(),
  setFontSize: (value: number) => terminalRef.value?.setFontSize(value),
  getFontSize: () => terminalRef.value?.getFontSize(),
  setFontFamily: (value: string) => terminalRef.value?.setFontFamily(value),
  getFontFamily: () => terminalRef.value?.getFontFamily(),
  setWordWrap: (value: boolean) => terminalRef.value?.setWordWrap(value),
  setLineNumbers: (value: boolean) => terminalRef.value?.setLineNumbers(value),
  setLogEditable: (value: boolean) => terminalRef.value?.setLogEditable(value)
})
</script>
