<template>
  <div class="settings-page">
    <!-- 搜索框 -->
    <div class="settings-search">
      <div class="search-inner">
        <input
          type="text"
          :placeholder="t('settings.search')"
          v-model="searchKeyword"
          class="search-input"
        />
        <button class="clear-btn" @click="searchKeyword = ''" v-if="searchKeyword">×</button>
      </div>
    </div>

    <!-- 设置内容区 -->
    <div class="settings-content">
      <!-- 左侧分类导航 -->
      <div class="settings-nav">
        <div
          v-for="category in categories"
          :key="category.key"
          class="nav-item"
          :class="{ active: activeCategory === category.key }"
          @click="activeCategory = category.key"
        >
          {{ category.label }}
        </div>
        <div class="nav-footer">
          <el-button size="small" @click="resetSettings">{{ t('settings.reset') }}</el-button>
        </div>
      </div>

      <!-- 右侧设置项 -->
      <div class="settings-panel">
        <!-- 基本设置 -->
        <div v-if="activeCategory === 'basic'" class="settings-group">
          <!-- 基本配置 -->
          <div class="group-section">
            <div class="group-title">{{ t('basicSettings.title') }}</div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('basicSettings.language') }}</span>
                <span class="label-desc">{{ t('basicSettings.languageDesc') }}</span>
              </div>
              <el-select v-model="settings.language" size="small" style="width: 120px">
                <el-option :label="t('languages.zh-CN')" value="zh-CN" />
                <el-option :label="t('languages.en-US')" value="en-US" />
              </el-select>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('basicSettings.minimizeToTray') }}</span>
                <span class="label-desc">{{ t('basicSettings.minimizeToTrayDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.minimizeToTray" />
            </div>
          </div>

          <!-- 显示 -->
          <div class="group-section">
            <div class="group-title">{{ t('basicSettings.displayUnimplemented') }}</div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('basicSettings.autoScroll') }}</span>
                <span class="label-desc">{{ t('basicSettings.autoScrollDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.autoScroll" />
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('basicSettings.autoScrollToast') }}</span>
                <span class="label-desc">{{ t('basicSettings.autoScrollToastDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.autoScrollToast" />
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('basicSettings.autoScrollOnFocus') }}</span>
                <span class="label-desc">{{ t('basicSettings.autoScrollOnFocusDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.autoScrollOnFocus" />
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('basicSettings.autoScrollAfterSend') }}</span>
                <span class="label-desc">{{ t('basicSettings.autoScrollAfterSendDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.autoScrollAfterSend" />
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('basicSettings.autoScrollOnWheel') }}</span>
                <span class="label-desc">{{ t('basicSettings.autoScrollOnWheelDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.autoScrollOnWheel" />
            </div>
          </div>

          <!-- 备份 -->
          <div class="group-section">
            <div class="group-title">{{ t('basicSettings.backupUnimplemented') }}</div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('basicSettings.autoBackup') }}</span>
                <span class="label-desc">{{ t('basicSettings.autoBackupDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.autoBackup" />
            </div>
            <div class="setting-item" v-if="settings.autoBackup">
              <div class="setting-label">
                <span class="label-text">{{ t('basicSettings.backupInterval') }}</span>
                <span class="label-desc">{{ t('basicSettings.backupIntervalDesc') }}</span>
              </div>
              <el-select v-model="settings.backupInterval" size="small" style="width: 100px">
                <el-option :label="`1 ${t('basicSettings.day')}`" :value="1" />
                <el-option :label="`3 ${t('basicSettings.day')}`" :value="3" />
                <el-option :label="`7 ${t('basicSettings.day')}`" :value="7" />
                <el-option :label="`15 ${t('basicSettings.day')}`" :value="15" />
                <el-option :label="`30 ${t('basicSettings.day')}`" :value="30" />
                <el-option :label="`60 ${t('basicSettings.day')}`" :value="60" />
                <el-option :label="`180 ${t('basicSettings.day')}`" :value="180" />
              </el-select>
            </div>
          </div>

          <!-- 系统 -->
          <div class="group-section">
            <div class="group-title">{{ t('basicSettings.system') }}</div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('basicSettings.preventSleep') }}</span>
                <span class="label-desc">{{ t('basicSettings.preventSleepDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.preventSleep" />
            </div>
          </div>
        </div>

        <!-- 串口设置 -->
        <div v-else-if="activeCategory === 'serial'" class="settings-group">
          <div class="group-section">
            <div class="group-title">{{ t('serialSettings.title') }}</div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('serialSettings.supportedBaudRates') }}</span>
                <span class="label-desc">{{ t('serialSettings.supportedBaudRatesDesc') }}</span>
              </div>
              <div class="baudrate-tags">
                <el-tag
                  v-for="rate in settings.supportedBaudRates"
                  :key="rate"
                  closable
                  size="small"
                  effect="dark"
                  @close="removeBaudRate(rate)"
                  class="baudrate-tag"
                >
                  {{ rate }}
                </el-tag>
                <el-input
                  v-if="addingBaudRate"
                  ref="baudRateInputRef"
                  v-model="newBaudRate"
                  size="small"
                  style="width: 80px"
                  @keyup.enter="confirmAddBaudRate"
                  @blur="confirmAddBaudRate"
                />
                <el-button v-else size="small" text type="primary" @click="startAddBaudRate">+ {{ t('serialSettings.addNew') }}</el-button>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('serialSettings.showPortType') }}</span>
                <span class="label-desc">{{ t('serialSettings.showPortTypeDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.showPortType" />
            </div>
          </div>
        </div>

        <!-- 日志 -->
        <div v-else-if="activeCategory === 'log'" class="settings-group">
          <div class="group-section">
            <div class="group-title">{{ t('logSettings.title') }}</div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('logSettings.enableLogStorage') }}</span>
                <span class="label-desc">{{ t('logSettings.enableLogStorageDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.enableLogStorage" />
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('logSettings.logPath') }}</span>
                <span class="label-desc">{{ t('logSettings.logPathDesc') }}</span>
              </div>
              <el-input v-model="settings.logPath" size="small" style="width: 200px" />
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('logSettings.logSplitSize') }}</span>
                <span class="label-desc">{{ t('logSettings.logSplitSizeDesc') }}</span>
              </div>
              <div class="slider-control">
                <el-slider
                  v-model="settings.logSplitSize"
                  :min="1"
                  :max="100"
                  :step="1"
                  :show-tooltip="false"
                  style="width: 120px"
                />
                <span class="slider-value">{{ settings.logSplitSize }} MB</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 语法高亮 -->
        <div v-else-if="activeCategory === 'syntax'" class="settings-group">
          <div class="group-section">
            <div class="group-title">{{ t('syntaxSettings.title') }}</div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('syntaxSettings.enableSyntaxHighlight') }}</span>
                <span class="label-desc">{{ t('syntaxSettings.enableSyntaxHighlightDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.enableSyntaxHighlight" />
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('syntaxSettings.syntaxTheme') }}</span>
                <span class="label-desc">{{ t('syntaxSettings.syntaxThemeDesc') }}</span>
              </div>
              <el-select v-model="settings.syntaxTheme" size="small" style="width: 120px">
                <el-option :label="t('syntaxSettings.dark')" value="dark" />
                <el-option :label="t('syntaxSettings.light')" value="light" />
              </el-select>
            </div>
          </div>
        </div>

        <!-- 搜索 -->
        <div v-else-if="activeCategory === 'search'" class="settings-group">
          <div class="group-section">
            <div class="group-title">{{ t('searchSettings.title') }}</div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('searchSettings.caseSensitive') }}</span>
                <span class="label-desc">{{ t('searchSettings.caseSensitiveDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.searchCaseSensitive" />
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('searchSettings.regex') }}</span>
                <span class="label-desc">{{ t('searchSettings.regexDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.searchRegex" />
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span class="label-text">{{ t('searchSettings.wholeWord') }}</span>
                <span class="label-desc">{{ t('searchSettings.wholeWordDesc') }}</span>
              </div>
              <el-switch class="terminal-switch" v-model="settings.searchWholeWord" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { setLocale } from '../locales'

const { t } = useI18n()

const searchKeyword = ref('')
const activeCategory = ref('basic')

const categories = computed(() => [
  { key: 'basic', label: t('settingsNav.basic') },
  { key: 'serial', label: t('settingsNav.serial') },
  { key: 'log', label: t('settingsNav.log') },
  { key: 'syntax', label: t('settingsNav.syntax') },
  { key: 'search', label: t('settingsNav.search') }
])

// 默认配置从后端获取
const defaultSettings = ref<Record<string, any>>({})

const settings = ref<Record<string, any>>({})
let isLoading = true

const loadDefaultSettings = async () => {
  try {
    const data = await window.storageApi.getDefaultSettings()
    if (data && typeof data === 'object') {
      defaultSettings.value = data
    }
  } catch (error) {
    console.error(t('common.loadFailed'), error)
  }
}

const loadSettings = async () => {
  try {
    const data = await window.storageApi.getSettings()
    if (data && typeof data === 'object') {
      settings.value = { ...defaultSettings.value, ...data }
      isLoading = false
    }
  } catch (error) {
    console.error(t('common.loadFailed'), error)
  }
}

const saveSettings = async () => {
  try {
    const plainSettings = JSON.parse(JSON.stringify(settings.value))
    await window.storageApi.saveSettings(plainSettings)
    window.dispatchEvent(new CustomEvent('settings-updated', { detail: plainSettings }))
    // 通知主进程设置更新（用于防止屏幕息屏功能）
    window.toolApi?.notifySettingsUpdate(plainSettings)
  } catch (error) {
    console.error(t('common.saveFailed'), error)
  }
}

// 监听设置变化，自动保存
watch(settings, () => {
  if (!isLoading) {
    saveSettings()
  }
}, { deep: true })

// 监听语言设置变化，实时切换界面语言
watch(() => settings.value.language, (newLocale) => {
  if (newLocale && (newLocale === 'zh-CN' || newLocale === 'en-US')) {
    setLocale(newLocale)
  }
})

const resetSettings = async () => {
  try {
    await ElMessageBox.confirm(t('settings.resetConfirm'), t('settings.reset'), {
      confirmButtonText: t('settings.confirm'),
      cancelButtonText: t('settings.cancel'),
      type: 'warning',
      center: true,
      confirmButtonClass: 'el-button--primary',
      cancelButtonClass: 'el-button--danger'
    })
    settings.value = JSON.parse(JSON.stringify(defaultSettings.value))
    ElMessage.success(t('settings.resetSuccess'))
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(t('common.operationFailed'), error)
    }
  }
}

// 波特率管理
const addingBaudRate = ref(false)
const newBaudRate = ref('')
const baudRateInputRef = ref()

const removeBaudRate = (rate: number) => {
  const rates = settings.value.supportedBaudRates
  if (rates.length > 1) {
    settings.value.supportedBaudRates = rates.filter(r => r !== rate)
  } else {
    ElMessage.warning(t('serialSettings.atLeastOneRate'))
  }
}

const startAddBaudRate = () => {
  addingBaudRate.value = true
  nextTick(() => {
    baudRateInputRef.value?.focus()
  })
}

const confirmAddBaudRate = () => {
  const rate = parseInt(newBaudRate.value)
  if (isNaN(rate) || rate <= 0) {
    ElMessage.warning(t('serialSettings.invalidBaudRate'))
  } else if (settings.value.supportedBaudRates.includes(rate)) {
    ElMessage.warning(t('serialSettings.rateExists'))
  } else {
    settings.value.supportedBaudRates.push(rate)
    settings.value.supportedBaudRates.sort((a, b) => a - b)
  }
  addingBaudRate.value = false
  newBaudRate.value = ''
}

onMounted(async () => {
  await loadDefaultSettings()
  await loadSettings()

  // 监听设置更新事件（ComTerminal 修改波特率列表时刷新显示）
  window.addEventListener('settings-updated', handleSettingsUpdated)
})

onUnmounted(() => {
  window.removeEventListener('settings-updated', handleSettingsUpdated)
})

// 设置更新处理
const handleSettingsUpdated = (event: Event) => {
  const updatedSettings = (event as CustomEvent).detail
  if (updatedSettings && 'supportedBaudRates' in updatedSettings) {
    // 刷新波特率列表显示（使用 splice 保持响应性）
    settings.value.supportedBaudRates.splice(0, settings.value.supportedBaudRates.length, ...updatedSettings.supportedBaudRates)
  }
}
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.settings-search {
  flex-shrink: 0;
  padding: 8px;
  background: transparent;
}

.search-inner {
  position: relative;
  width: 100%;
  height: 32px;
}

.search-input {
  width: 100%;
  height: 100%;
  padding: 0 28px 0 12px;
  border: 1px solid transparent;
  background-color: #3c3c3c;
  color: #cccccc;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #007fd4;
  box-shadow: 0 0 0 1px #007fd4 inset;
}

.clear-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.clear-btn:hover {
  color: #111827;
}

.settings-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.settings-nav {
  width: 140px;
  background: #252526;
  border-right: 1px solid #3c3c3c;
  padding: 8px 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.nav-item {
  padding: 8px 16px;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.nav-item:hover {
  background: #2a2d2e;
}

.nav-item.active {
  background: #094771;
  color: #fff;
}

.nav-footer {
  margin-top: auto;
  padding: 16px 8px;
  border-top: 1px solid #3c3c3c;
}

.nav-footer .el-button {
  width: 100%;
  background-color: #0e639c;
  border: none;
  color: #fff;
}

.nav-footer .el-button:hover {
  background-color: #1177bb;
}

.settings-panel {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.settings-group {
  max-width: 700px;
}

.group-section {
  background: #252526;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

.group-section:last-child {
  margin-bottom: 0;
}

.group-title {
  color: #cccccc;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #3c3c3c;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #3c3c3c;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-text {
  color: #e0e0e0;
  font-size: 13px;
}

.label-desc {
  color: #808080;
  font-size: 11px;
}

.slider-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-value {
  color: #e0e0e0;
  font-size: 12px;
  min-width: 50px;
  text-align: right;
}

/* Switch 样式与 TerminalControl 一致 */
:deep(.el-switch) {
  --el-switch-on-color: #165dff;
  --el-switch-off-color: #444;
}

/* Slider 样式与 Switch 一致 */
:deep(.el-slider__runway) {
  background-color: #444;
}

:deep(.el-slider__bar) {
  background-color: #165dff;
}

.baudrate-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 300px;
  align-items: center;
}

.baudrate-tag {
  background: #3c3c3c;
  border-color: #555;
  color: #e0e0e0;
}

.baudrate-tag:hover {
  background: #4c4c4c;
}

/* 滚动条美化 */
.settings-panel::-webkit-scrollbar {
  width: 10px;
}

.settings-panel::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.settings-panel::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.settings-panel::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}

.settings-panel::-webkit-scrollbar-corner {
  background: #1e1e1e;
}
</style>
