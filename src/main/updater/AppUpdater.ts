import { autoUpdater } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import logger from '../ipc/IpcAppLogger'

export type UpdateStatus =
  | 'checking'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error'
  | 'check-error'

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
  files?: Array<{ url: string; size: number }>
}

export interface ProgressInfo {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

export default class AppUpdater {
  private static sInstance: AppUpdater
  private mainWindow: BrowserWindow | null = null
  private _cachedUpdateInfo: UpdateInfo | null = null

  static getInstance(): AppUpdater {
    if (!AppUpdater.sInstance) {
      AppUpdater.sInstance = new AppUpdater()
    }
    return AppUpdater.sInstance
  }

  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow

    // 开发模式下强制启用更新检查
    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true
      autoUpdater.updateConfigPath = null // 使用 dev-app-update.yml
    }

    // 配置 autoUpdater - 支持断点续传
    autoUpdater.autoDownload = false // 手动控制下载，让用户选择
    autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装
    autoUpdater.allowDowngrade = false
    autoUpdater.allowPrerelease = false

    // 日志输出
    autoUpdater.logger = {
      info: (msg) => logger.info(`[Updater] ${msg}`),
      warn: (msg) => logger.info(`[Updater] ${msg}`),
      error: (msg) => logger.error(`[Updater] ${msg}`),
      debug: (msg) => logger.info(`[Updater] ${msg}`)
    }

    // ========== 事件监听 ==========

    // 检查更新时触发
    autoUpdater.on('checking-for-update', () => {
      logger.info('[Updater] Checking for updates...')
      this.sendStatus('checking')
    })

    // 发现新版本
    autoUpdater.on('update-available', (info) => {
      logger.info(`[Updater] New version available: ${info.version}`)
      this._cachedUpdateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: typeof info.releaseNotes === 'string'
          ? info.releaseNotes
          : Array.isArray(info.releaseNotes)
            ? info.releaseNotes.map((n: any) => n.note || n).join('\n')
            : '',
        files: info.files?.map((f) => ({ url: f.url, size: f.size ?? 0 }))
      }
      this.sendStatus('update-available', this._cachedUpdateInfo)
    })

    // 没有新版本
    autoUpdater.on('update-not-available', (info) => {
      logger.info(`[Updater] Already up to date: ${info.version}`)
      this.sendStatus('update-not-available', { version: info.version })
    })

    // 下载进度（支持断点续传，百分比会反映实际进度）
    autoUpdater.on('download-progress', (progress) => {
      this.sendStatus('download-progress', {
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      })
    })

    // 更新包下载完成
    autoUpdater.on('update-downloaded', (info) => {
      logger.info(`[Updater] Update downloaded: ${info.version}`)
      this.sendStatus('update-downloaded', {
        version: info.version,
        releaseNotes: this._cachedUpdateInfo?.releaseNotes || ''
      })
    })

    // 下载出错
    autoUpdater.on('error', (error) => {
      logger.error(`[Updater] Update error: ${error.message}`)
      // 断点续传相关错误不视为致命错误
      if (error.message?.includes('sha512') || error.message?.includes('checksum')) {
        this.sendStatus('error', { message: 'Checksum verification failed, re-downloading...' })
        // 清除缓存重新下载
        autoUpdater.downloadUpdate().catch(() => {})
      } else {
        this.sendStatus('error', { message: error.message })
      }
    })

    logger.info('[Updater] Initialization complete')
  }

  /** 检查更新 */
  async checkForUpdates(): Promise<void> {
    try {
      logger.info('[Updater] Starting update check')
      await autoUpdater.checkForUpdates()
    } catch (err: any) {
      logger.error(`[Updater] Update check failed: ${err.message}`)
      this.sendStatus('check-error', { message: err.message || 'Update check failed' })
    }
  }

  /** 开始下载更新 */
  async startDownload(): Promise<void> {
    try {
      logger.info('[Updater] Starting download')
      await autoUpdater.downloadUpdate()
    } catch (err: any) {
      logger.error(`[Updater] Download failed: ${err.message}`)
      this.sendStatus('error', { message: err.message || 'Download failed' })
    }
  }

  /** 立即安装并重启 */
  quitAndInstall(): void {
    logger.info('[Updater] Quit and install update')
    autoUpdater.quitAndInstall(false, true)
  }

  /** 获取缓存的更新信息 */
  get cachedUpdateInfo(): UpdateInfo | null {
    return this._cachedUpdateInfo
  }

  /** 向渲染进程发送更新状态 */
  private sendStatus(status: UpdateStatus, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { status, data })
    }
  }
}
