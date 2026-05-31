<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="460px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <div class="update-content">
      <!-- 检查中 -->
      <div v-if="status === 'checking'" class="update-status">
        <el-icon class="status-icon spinning" :size="40"><Loading /></el-icon>
        <p class="status-text">{{ t('update.checking') }}</p>
      </div>

      <!-- 已是最新版本 -->
      <div v-else-if="status === 'update-not-available'" class="update-status">
        <el-icon class="status-icon success" :size="40"><CircleCheck /></el-icon>
        <p class="status-text">{{ t('update.upToDate') }}</p>
        <p class="status-subtext">{{ t('update.currentVersion', { version: currentVersion }) }}</p>
      </div>

      <!-- 发现新版本 -->
      <div v-else-if="status === 'update-available'" class="update-status">
        <el-icon class="status-icon info" :size="40"><InfoFilled /></el-icon>
        <p class="status-text">{{ t('update.newVersionAvailable', { version: updateInfo?.version }) }}</p>
        <p class="status-subtext">{{ t('update.currentVersion', { version: currentVersion }) }} → <strong>{{ updateInfo?.version }}</strong></p>

        <!-- 更新日志 -->
        <div v-if="updateInfo?.releaseNotes" class="release-notes">
          <div class="release-notes-title">{{ t('update.releaseNotes') }}</div>
          <div class="release-notes-content" v-html="formatReleaseNotes(updateInfo.releaseNotes)"></div>
        </div>
      </div>

      <!-- 下载进度 -->
      <div v-else-if="status === 'download-progress'" class="update-status">
        <el-icon class="status-icon spinning" :size="40"><Loading /></el-icon>
        <p class="status-text">{{ t('update.downloading') }}</p>
        <div class="progress-wrapper">
          <el-progress
            :percentage="progressInfo?.percent || 0"
            :stroke-width="12"
            :color="progressColor"
          />
        </div>
        <p class="status-subtext">
          {{ formatSize(progressInfo?.transferred || 0) }} / {{ formatSize(progressInfo?.total || 0) }}
          <span v-if="progressInfo?.bytesPerSecond"> · {{ formatSpeed(progressInfo.bytesPerSecond) }}</span>
        </p>
      </div>

      <!-- 下载完成 -->
      <div v-else-if="status === 'update-downloaded'" class="update-status">
        <el-icon class="status-icon success" :size="40"><CircleCheck /></el-icon>
        <p class="status-text">{{ t('update.downloadComplete') }}</p>
        <p class="status-subtext">{{ t('update.restartPrompt') }}</p>
      </div>

      <!-- 错误 -->
      <div v-else-if="status === 'error' || status === 'check-error'" class="update-status">
        <el-icon class="status-icon error" :size="40"><CircleClose /></el-icon>
        <p class="status-text">{{ t('update.error') }}</p>
        <p class="status-subtext">{{ errorMessage }}</p>
      </div>
    </div>

    <template #footer>
      <div class="update-footer">
        <el-button v-if="canRetry" class="btn-cancel" @click="handleRetry">
          {{ t('update.retry') }}
        </el-button>
        <el-button v-if="canClose" class="btn-cancel" @click="handleClose">
          {{ t('common.cancel') }}
        </el-button>
        <el-button
          v-if="status === 'update-available'"
          class="btn-primary"
          @click="handleStartDownload"
        >
          {{ t('update.startUpdate') }}
        </el-button>
        <el-button
          v-if="status === 'update-downloaded'"
          class="btn-primary"
          @click="handleRestart"
        >
          {{ t('update.restartNow') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loading, CircleCheck, CircleClose, InfoFilled } from '@element-plus/icons-vue'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const status = ref<string>('checking')
const updateInfo = ref<{ version: string; releaseNotes?: string; files?: Array<{ url: string; size: number }> } | null>(null)
const progressInfo = ref<{ percent: number; transferred: number; total: number; bytesPerSecond: number } | null>(null)
const errorMessage = ref('')
const currentVersion = ref('')

const progressColor = computed(() => {
  const pct = progressInfo.value?.percent || 0
  if (pct < 30) return '#e6a23c'
  if (pct < 70) return '#409eff'
  return '#67c23a'
})

const dialogTitle = computed(() => {
  switch (status.value) {
    case 'checking': return t('update.checking')
    case 'update-available': return t('update.newVersionAvailable', { version: updateInfo.value?.version || '' })
    case 'download-progress': return t('update.downloadingTitle', { percent: progressInfo.value?.percent || 0 })
    case 'update-downloaded': return t('update.downloadComplete')
    case 'update-not-available': return t('update.checkUpdate')
    case 'error':
    case 'check-error': return t('update.error')
    default: return t('update.checkUpdate')
  }
})

const canRetry = computed(() => status.value === 'error' || status.value === 'check-error')
const canClose = computed(() =>
  status.value === 'update-not-available' ||
  status.value === 'error' ||
  status.value === 'check-error'
)

const formatReleaseNotes = (notes: string): string => {
  return notes
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/(#+\s*)(.*)/g, '<strong>$2</strong>')
    .replace(/(\*\s+)(.*)/g, '· $2')
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s'
  if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s'
  return (bytesPerSecond / (1024 * 1024)).toFixed(1) + ' MB/s'
}

let removeListener: (() => void) | null = null

const handleStartDownload = () => {
  window.updateApi.startDownload()
}

const handleRestart = () => {
  window.updateApi.quitAndInstall()
}

const handleRetry = () => {
  status.value = 'checking'
  errorMessage.value = ''
  window.updateApi.checkForUpdates()
}

const handleClose = () => {
  visible.value = false
}

const open = async () => {
  visible.value = true
  status.value = 'checking'
  updateInfo.value = null
  progressInfo.value = null
  errorMessage.value = ''

  // 获取当前版本
  try {
    currentVersion.value = await window.windowApi.getAppVersion()
  } catch {
    currentVersion.value = 'unknown'
  }

  // 注册更新状态监听
  if (removeListener) removeListener()
  removeListener = window.updateApi.onUpdateStatus((data) => {
    status.value = data.status
    if (data.data) {
      switch (data.status) {
        case 'update-available':
          updateInfo.value = data.data
          break
        case 'download-progress':
          progressInfo.value = data.data
          break
        case 'update-downloaded':
          updateInfo.value = { ...updateInfo.value, version: data.data.version }
          break
        case 'error':
        case 'check-error':
          errorMessage.value = data.data?.message || t('update.unknownError')
          break
      }
    }
  })

  // 触发检查
  try {
    await window.updateApi.checkForUpdates()
  } catch {
    // 错误通过事件处理
  }
}

watch(visible, (val) => {
  if (!val && removeListener) {
    removeListener()
    removeListener = null
  }
})

defineExpose({ open })
</script>

<style scoped>
.update-content {
  padding: 8px 0;
  min-height: 120px;
}

.update-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.status-icon {
  color: #888;
}

.status-icon.success {
  color: #67c23a;
}

.status-icon.error {
  color: #f56c6c;
}

.status-icon.info {
  color: #409eff;
}

.status-icon.spinning {
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-text {
  color: #e0e0e0;
  font-size: 15px;
  font-weight: 600;
  margin: 4px 0;
}

.status-subtext {
  color: #888;
  font-size: 13px;
  margin: 0;
}

.release-notes {
  width: 100%;
  margin-top: 8px;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  padding: 10px;
  text-align: left;
  max-height: 200px;
  overflow-y: auto;
}

.release-notes-title {
  color: #ccc;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #3c3c3c;
}

.release-notes-content {
  color: #aaa;
  font-size: 12px;
  line-height: 1.6;
}

.progress-wrapper {
  width: 100%;
  margin: 8px 0;
}

.progress-wrapper :deep(.el-progress-bar__outer) {
  background-color: #3c3c3c;
}

.update-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 滚动条 */
.release-notes::-webkit-scrollbar {
  width: 6px;
}

.release-notes::-webkit-scrollbar-track {
  background: transparent;
}

.release-notes::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 3px;
}

.release-notes::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
