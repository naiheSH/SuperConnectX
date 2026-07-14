/**
 * useSerialRemarks - 串口备注管理
 */
import { ref, reactive, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import type { ComTerminalRef } from './types'

export function useSerialRemarks(comTerminalRefs: Record<string, ComTerminalRef>) {
  const { t } = useI18n()

  const showRemarkDialog = ref(false)
  const editingRemark = ref('')
  const editingRemarkComName = ref('')
  const serialRemarks = reactive<Record<string, string>>({})
  const remarkInputRef = ref<any>(null)

  const loadSerialRemark = async (comName: string): Promise<string> => {
    if (serialRemarks[comName]) return serialRemarks[comName]
    try {
      const settings = await window.storageApi.getComSettings(comName)
      const remark = settings?.remark || ''
      serialRemarks[comName] = remark
      return remark
    } catch {
      return ''
    }
  }

  const loadAllSerialRemarks = async (serialPorts: SerialPortInfo[]) => {
    for (const port of serialPorts) {
      await loadSerialRemark(port.path)
    }
  }

  const openRemarkDialog = async (tab: { comName?: string; id: string | number }) => {
    if (!tab.comName) return
    editingRemarkComName.value = tab.comName
    const tabId = tab.id.toString()

    if (serialRemarks[editingRemarkComName.value]) {
      editingRemark.value = serialRemarks[editingRemarkComName.value]
    } else if (comTerminalRefs[tabId]?.getRemark) {
      editingRemark.value = comTerminalRefs[tabId].getRemark() || ''
    } else {
      try {
        const settings = await window.storageApi.getComSettings(editingRemarkComName.value)
        editingRemark.value = settings?.remark || ''
      } catch {
        editingRemark.value = ''
      }
    }
    showRemarkDialog.value = true
  }

  const onRemarkDialogOpened = () => {
    nextTick(() => {
      const input = remarkInputRef.value?.$el?.querySelector('input')
      if (input) { input.focus(); input.select() }
    })
  }

  const saveSerialRemark = async (rightClickedTab?: { id: string | number; comName?: string } | null) => {
    if (!editingRemarkComName.value) return
    serialRemarks[editingRemarkComName.value] = editingRemark.value

    if (rightClickedTab) {
      const tabId = rightClickedTab.id.toString()
      if (comTerminalRefs[tabId]?.updateRemark) {
        await comTerminalRefs[tabId].updateRemark(editingRemark.value)
        showRemarkDialog.value = false
        return
      }
    }

    try {
      const currentSettings = await window.storageApi.getComSettings(editingRemarkComName.value)
      await window.storageApi.saveComSettings(editingRemarkComName.value, {
        ...currentSettings,
        remark: editingRemark.value
      })
    } catch (error) {
      console.error(t('dialog.remarkSaveFailed'), error)
      ElMessage.error(t('dialog.remarkSaveFailed'))
    }
    showRemarkDialog.value = false
  }

  return {
    showRemarkDialog,
    editingRemark,
    editingRemarkComName,
    serialRemarks,
    remarkInputRef,
    loadSerialRemark,
    loadAllSerialRemarks,
    openRemarkDialog,
    onRemarkDialogOpened,
    saveSerialRemark
  }
}
