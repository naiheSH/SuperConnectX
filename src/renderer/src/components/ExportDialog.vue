<template>
  <el-dialog
    :title="t('exportDialog.title')"
    v-model="dialogVisible"
    width="480px"
    :close-on-click-modal="false"
  >
    <div class="export-desc">{{ t('exportDialog.description') }}</div>

    <el-checkbox-group v-model="selectedItems" class="export-checkbox-group">
      <el-checkbox
        v-for="item in exportItems"
        :key="item.key"
        :label="item.key"
        class="export-checkbox-item"
      >
        <div class="checkbox-content">
          <span class="checkbox-label">{{ item.label }}</span>
          <span class="checkbox-desc">{{ item.desc }}</span>
        </div>
      </el-checkbox>
    </el-checkbox-group>

    <div v-if="selectedItems.length === 0" class="no-selection-hint">
      {{ t('exportDialog.noSelection') }}
    </div>

    <template #footer>
      <el-button class="btn-cancel" @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button
        class="btn-primary submit-btn"
        :disabled="selectedItems.length === 0"
        @click="handleExport"
      >
        {{ t('exportDialog.exportBtn') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'

const { t } = useI18n()

const dialogVisible = ref(false)
const selectedItems = ref<string[]>([])

interface ExportItem {
  key: string
  label: string
  desc: string
}

const exportItems: ExportItem[] = [
  { key: 'settings', label: t('exportDialog.settings'), desc: t('exportDialog.settingsDesc') },
  { key: 'commandGroups', label: t('exportDialog.commandGroups'), desc: t('exportDialog.commandGroupsDesc') },
  { key: 'commands', label: t('exportDialog.commands'), desc: t('exportDialog.commandsDesc') },
  { key: 'comPorts', label: t('exportDialog.comPorts'), desc: t('exportDialog.comPortsDesc') },
  { key: 'connections', label: t('exportDialog.connections'), desc: t('exportDialog.connectionsDesc') }
]

const open = () => {
  selectedItems.value = exportItems.map(item => item.key)
  dialogVisible.value = true
}

const handleExport = async () => {
  if (selectedItems.value.length === 0) return

  try {
    const result = await window.dialogApi.saveFileDialog({
      title: t('exportDialog.title'),
      defaultPath: `superconnectx-data-${getDateStr()}.zip`,
      filters: [{ name: 'ZIP 文件', extensions: ['zip'] }]
    })

    if (result.filePath) {
      const exportResult = await window.storageApi.exportData(
        result.filePath,
        JSON.parse(JSON.stringify(selectedItems.value))
      )
      if (exportResult.success) {
        dialogVisible.value = false
        ElMessage.success(t('exportDialog.exportSuccess'))
        // 导出成功后打开并选中文件
        window.toolApi.showItemInFolder(result.filePath)
      } else {
        ElMessage.error(`${t('exportDialog.exportFailed')}: ${exportResult.message}`)
      }
    }
  } catch (error) {
    console.error(t('exportDialog.exportFailed'), error)
    ElMessage.error(t('exportDialog.exportFailed'))
  }
}

const getDateStr = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

defineExpose({ open })
</script>

<style scoped>
.el-dialog {
  background: #252526 !important;
  border-radius: 8px !important;
}

.el-dialog__title {
  color: #f0f0f0 !important;
  font-size: 18px !important;
}

.export-desc {
  color: #a0a0a0;
  font-size: 13px;
  margin-bottom: 20px;
  line-height: 1.5;
}

.export-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.export-checkbox-item {
  padding: 10px 12px !important;
  border-radius: 6px;
  margin-right: 0 !important;
  width: 100%;
  height: auto !important;
  transition: background 0.15s;
}

.export-checkbox-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.el-checkbox {
  color: #e0e0e0 !important;
  --el-checkbox-checked-bg-color: var(--focus-border-color, #409eff);
  --el-checkbox-checked-input-border-color: var(--focus-border-color, #409eff);
}

.el-checkbox__label {
  color: #e0e0e0 !important;
  padding-left: 10px;
}

.checkbox-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checkbox-label {
  font-size: 14px;
  color: #e0e0e0;
  font-weight: 500;
}

.checkbox-desc {
  font-size: 12px;
  color: #888;
}

.no-selection-hint {
  text-align: center;
  color: #888;
  font-size: 13px;
  margin-top: 12px;
}

.submit-btn {
  width: 100px !important;
}
</style>
