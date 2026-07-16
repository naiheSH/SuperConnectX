import { appendFile, appendFileSync, existsSync, mkdirSync, statSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import { shell, app } from 'electron'
import fs from 'fs/promises'
import { dirname, join } from 'path'
import { getAppDataDir } from './AppDir'

// 磁盘空间相关
const diskSpace = (() => {
  try {
    return require('disk-size') // 可选依赖
  } catch {
    return null
  }
})()

export interface LogSplitCallback {
  (connId: string, oldFileName: string, newFileName: string): void
}

export default class ProtocolLogger {
  private logDir: string
  private logDirPattern: string = '' // 目录模板（用户设置的原始模板）
  private defaultLogDir: string // 默认目录（程序目录/logs）
  private connLogFiles = new Map<string, string>()
  private connLogFileHistory = new Map<string, string[]>()
  private connLogBaseNames = new Map<string, string>()
  private connLogDirs = new Map<string, string>() // 每个连接解析后的日志目录
  private connLogIndexes = new Map<string, number>()
  private connLogNames = new Map<string, string>() // 保存原始连接名
  private connLogRemarks = new Map<string, string>() // 保存备注名
  private logCache = new Map<string, string[]>()
  private failedCache = new Map<string, string[]>() // 写入失败的缓存
  private currentFileSizes = new Map<string, number>()
  private logSplitCallback: LogSplitCallback | null = null
  private writeTimer: NodeJS.Timeout | null = null
  private cleanupTimer: NodeJS.Timeout | null = null
  private retryTimer: NodeJS.Timeout | null = null // 失败重试定时器
  private readonly BATCH_WRITE_INTERVAL_MS = 10 * 1000
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 每小时检查一次
  private readonly RETRY_INTERVAL_MS = 60 * 1000 // 1分钟重试一次
  private logSplitSizeMB: number = 20 // 默认 20MB
  private enableLogStorage: boolean = true // 是否启用日志存储
  private logFileNamePattern: string = '%C-%Y-%M-%D-%hh-%mm-%ss' // 文件名模板
  private maxLogAgeDays: number = 30 // 日志最大保留天数
  private maxLogCount: number = 100 // 日志最大文件数
  private diskSpaceWarningMB: number = 100 // 磁盘空间预警阈值（MB）
  private isDiskSpaceLow: boolean = false // 磁盘空间是否不足

  constructor() {
    // 智能路径：exe 同目录（非系统盘有权限）或 userData（回退）
    this.defaultLogDir = join(getAppDataDir(), 'logs')
    this.logDir = this.defaultLogDir

    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }

    this.startWriteTimer()
    this.startCleanupTimer()
    this.startRetryTimer()
  }

  // 设置日志分片回调
  setLogSplitCallback(callback: LogSplitCallback | null): void {
    this.logSplitCallback = callback
  }

  // 设置日志分片大小（MB）
  setLogSplitSize(sizeMB: number): void {
    this.logSplitSizeMB = sizeMB
  }

  // 设置是否启用日志存储（运行时生效）
  setEnableLogStorage(enabled: boolean): void {
    this.enableLogStorage = enabled
  }

  // 获取日志存储启用状态
  getEnableLogStorage(): boolean {
    return this.enableLogStorage
  }

  // 设置日志目录模板（运行时生效）
  // dirPath 支持与文件名相同的占位符，在连接建立时解析
  setLogDir(dirPath: string): void {
    if (dirPath) {
      this.logDirPattern = dirPath
    } else {
      this.logDirPattern = ''
      this.logDir = this.defaultLogDir
      this.ensureDir(this.logDir)
    }
  }

  // 获取日志目录
  getLogDir(): string {
    return this.logDir
  }

  // 获取某个连接的日志目录
  private getConnLogDir(connId: string): string {
    return this.connLogDirs.get(connId) || this.defaultLogDir
  }

  // 根据模板和日期解析目录名
  private resolveDirName(connName: string, remark?: string): string {
    if (!this.logDirPattern) {
      return this.defaultLogDir
    }

    const date = new Date()
    const Y = String(date.getFullYear())
    const M = String(date.getMonth() + 1).padStart(2, '0')
    const D = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    const f = String(date.getMilliseconds()).padStart(3, '0')

    let result = this.logDirPattern
      .replace(/%C/g, connName)
      .replace(/%R/g, remark || '')
      .replace(/%Y/g, Y)
      .replace(/%M/g, M)
      .replace(/%D/g, D)
      .replace(/%h/g, h)
      .replace(/%m/g, m)
      .replace(/%s/g, s)
      .replace(/%f/g, f)
      // 不补零版本
      .replace(/%MM/g, String(date.getMonth() + 1))
      .replace(/%DD/g, String(date.getDate()))
      .replace(/%hh/g, String(date.getHours()))
      .replace(/%mm/g, String(date.getMinutes()))
      .replace(/%ss/g, String(date.getSeconds()))
      .replace(/%fff/g, String(date.getMilliseconds()))

    // 替换非法文件名字符（保留 \ / : 作为路径分隔符和盘符）
    return result.replace(/[*?"<>|]/g, '-')
  }

  // 确保目录存在
  private ensureDir(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true })
    }
  }

  // 设置日志文件名模板
  setLogFileName(pattern: string): void {
    if (pattern) {
      this.logFileNamePattern = pattern
    }
  }

  // 生成高精度时间戳
  getFileTimeStamp(): string {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(
      date.getMinutes()
    ).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}-${String(
      date.getMilliseconds()
    ).padStart(3, '0')}`
  }

  getTimeStamp(): string {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(
      date.getMilliseconds()
    ).padStart(3, '0')}`
  }

  // 启动定时写入
  private startWriteTimer(): void {
    this.writeTimer = setInterval(() => {
      this.flushAllLogs(false) // 正常运行时异步写入，不阻塞事件循环
    }, this.BATCH_WRITE_INTERVAL_MS)
    if (this.writeTimer.unref) this.writeTimer.unref()
  }

  // 启动定时清理旧日志
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldLogs()
    }, this.CLEANUP_INTERVAL_MS)
    if (this.cleanupTimer.unref) this.cleanupTimer.unref()
  }

  // 启动失败重试定时器
  private startRetryTimer(): void {
    this.retryTimer = setInterval(() => {
      this.retryFailedLogs()
    }, this.RETRY_INTERVAL_MS)
    if (this.retryTimer.unref) this.retryTimer.unref()
  }

  // 重试失败的日志写入
  private retryFailedLogs(): void {
    if (this.failedCache.size === 0) return

    // 将失败缓存移回正常缓存
    this.failedCache.forEach((entries, connId) => {
      const currentCache = this.logCache.get(connId) || []
      this.logCache.set(connId, [...currentCache, ...entries])
    })
    this.failedCache.clear()

    // 尝试重新写入
    this.flushAllLogs(false)
  }

  // 设置日志最大保留天数
  setMaxLogAgeDays(days: number): void {
    this.maxLogAgeDays = days
  }

  // 设置日志最大文件数
  setMaxLogCount(count: number): void {
    this.maxLogCount = count
  }

  // 手动触发清理（公开方法）
  manualCleanup(): { deletedCount: number; deletedSize: number } {
    const beforeCount = this.countLogFiles()
    this.cleanupOldLogs()
    const afterCount = this.countLogFiles()
    return {
      deletedCount: beforeCount - afterCount,
      deletedSize: 0 // 简化实现，不计算具体大小
    }
  }

  // 统计日志文件数量
  private countLogFiles(): number {
    try {
      const logDir = this.logDir
      if (!existsSync(logDir)) return 0
      const files = readdirSync(logDir)
      return files.filter(f => f.endsWith('.log')).length
    } catch {
      return 0
    }
  }

  // 清理旧日志文件
  private cleanupOldLogs(): void {
    try {
      const logDir = this.logDir
      if (!existsSync(logDir)) return

      // 收集当前正在使用的日志文件（排除这些文件）
      const activeLogFiles = new Set<string>()
      this.connLogFiles.forEach((fileName) => {
        activeLogFiles.add(fileName)
      })

      const files = readdirSync(logDir)
      const logFiles = files
        .filter(f => f.endsWith('.log') && !activeLogFiles.has(f)) // 排除活跃文件
        .map(f => {
          const filePath = join(logDir, f)
          try {
            const stats = statSync(filePath)
            return { name: f, path: filePath, mtime: stats.mtimeMs, size: stats.size }
          } catch {
            return null
          }
        })
        .filter((f): f is { name: string; path: string; mtime: number; size: number } => f !== null)
        .sort((a, b) => b.mtime - a.mtime) // 按修改时间倒序

      const now = Date.now()

      // 1. 按时间清理超期日志（0 = 不清理）
      if (this.maxLogAgeDays > 0) {
        const maxAgeMs = this.maxLogAgeDays * 24 * 60 * 60 * 1000
        for (const file of logFiles) {
          if (now - file.mtime > maxAgeMs) {
            try {
              unlinkSync(file.path)
            } catch {
              // 忽略删除失败
            }
          }
        }
      }

      // 2. 按数量清理（0 = 不限制）
      if (this.maxLogCount > 0) {
        const remainingFiles = logFiles.filter(f => existsSync(f.path))
        if (remainingFiles.length > this.maxLogCount) {
          const filesToDelete = remainingFiles.slice(this.maxLogCount)
          for (const file of filesToDelete) {
            try {
              unlinkSync(file.path)
            } catch {
              // 忽略删除失败
            }
          }
        }
      }
    } catch {
      // 忽略清理过程中的错误
    }
  }

  // 检查磁盘空间
  private checkDiskSpace(): boolean {
    try {
      // 尝试使用 disk-size 库
      if (diskSpace && diskSpace.getDiskSpace) {
        const result = diskSpace.getDiskSpace(this.logDir)
        if (result && result.free) {
          const freeMB = result.free / (1024 * 1024)
          if (freeMB < this.diskSpaceWarningMB) {
            if (!this.isDiskSpaceLow) {
              console.warn(`[ProtocolLogger] Low disk space: ${freeMB.toFixed(1)}MB remaining, logging paused`)
              this.isDiskSpaceLow = true
            }
            return false
          }
          this.isDiskSpaceLow = false
          return true
        }
      }

      // 回退：使用 statfs（Node.js 18+）
      const { statfsSync } = require('fs') as any
      if (statfsSync) {
        const stats = statfsSync(this.logDir)
        const freeMB = (stats.bavail * stats.bsize) / (1024 * 1024)
        if (freeMB < this.diskSpaceWarningMB) {
          if (!this.isDiskSpaceLow) {
            console.warn(`[ProtocolLogger] Low disk space: ${freeMB.toFixed(1)}MB remaining, logging paused`)
            this.isDiskSpaceLow = true
          }
          return false
        }
        this.isDiskSpaceLow = false
        return true
      }
    } catch {
      // 无法检测时假设正常
    }
    return true
  }

  // 获取磁盘空间状态
  getDiskSpaceStatus(): { isLow: boolean; warningMB: number } {
    return { isLow: this.isDiskSpaceLow, warningMB: this.diskSpaceWarningMB }
  }

  // 设置磁盘空间预警阈值
  setDiskSpaceWarningMB(mb: number): void {
    this.diskSpaceWarningMB = mb
  }

  // 检查并处理日志分片
  private checkAndSplitLog(connId: string): string {
    const fileName = this.connLogFiles.get(connId)
    if (!fileName) return fileName || ''

    // 0 = 不分片
    if (this.logSplitSizeMB <= 0) return fileName

    const logFile = join(this.getConnLogDir(connId), fileName)

    // 获取当前文件大小
    let currentSize = this.currentFileSizes.get(connId) || 0

    if (existsSync(logFile)) {
      try {
        const stats = statSync(logFile)
        currentSize = stats.size
      } catch (err) {
        console.error(`Failed to get log file size:`, err)
      }
    }

    // 如果超过阈值，创建新文件
    const maxSizeBytes = this.logSplitSizeMB * 1024 * 1024
    if (currentSize >= maxSizeBytes) {
      const oldFileName = fileName
      const index = (this.connLogIndexes.get(connId) || 0) + 1
      this.connLogIndexes.set(connId, index)

      const baseName = this.connLogBaseNames.get(connId) || oldFileName.replace(/\.log$/, '')
      const newFileName = `${baseName}-${index}.log`
      this.connLogFiles.set(connId, newFileName)
      this.connLogFileHistory.set(connId, [...(this.connLogFileHistory.get(connId) || []), newFileName])
      this.currentFileSizes.set(connId, 0)

      // 触发分片回调
      if (this.logSplitCallback) {
        this.logSplitCallback(connId, oldFileName, newFileName)
      }

      return newFileName
    }

    return fileName
  }

  // 批量写入日志（默认异步，isSync=true 时同步写入）
  private flushAllLogs(isSync: boolean = false): void {
    this.logCache.forEach((logEntries, connId) => {
      if (logEntries.length <= 0) {
        return
      }

      // 检查是否需要分片
      this.checkAndSplitLog(connId)

      const fileName = this.connLogFiles.get(connId)
      if (!fileName) return

      const logFile = join(this.getConnLogDir(connId), fileName)
      const logData = logEntries.join('\n') + '\n'

      try {
        this.ensureDir(dirname(logFile))
        if (isSync) {
          // 退出时同步写入
          appendFileSync(logFile, logData, 'utf-8')
          const stats = statSync(logFile)
          this.currentFileSizes.set(connId, stats.size)
        } else {
          // 正常运行时异步写入（不阻塞事件循环）
          appendFile(logFile, logData, 'utf-8', (err) => {
            if (err) {
              console.error(`Async write log failed [connId:${connId}]:`, err)
              // 写入失败，将数据移入失败缓存
              const failed = this.failedCache.get(connId) || []
              this.failedCache.set(connId, [...failed, ...logEntries])
            } else {
              try {
                const stats = statSync(logFile)
                this.currentFileSizes.set(connId, stats.size)
              } catch { /* ignore */ }
            }
          })
        }
        this.logCache.set(connId, []) // 清空缓存
      } catch (err) {
        console.error(`Write log failed [connId:${connId}]:`, err)
        // 同步写入失败，将数据移入失败缓存
        const failed = this.failedCache.get(connId) || []
        this.failedCache.set(connId, [...failed, ...logEntries])
      }
    })
  }

  flush(): void {
    if (this.writeTimer) {
      clearInterval(this.writeTimer)
      this.writeTimer = null
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    if (this.retryTimer) {
      clearInterval(this.retryTimer)
      this.retryTimer = null
    }
    // 退出前重试失败的日志
    this.retryFailedLogs()
    this.flushAllLogs(true)
  }

  // 根据模板和日期生成文件名
  private resolveFileName(connName: string, remark?: string): string {
    const date = new Date()
    const Y = String(date.getFullYear())
    const M = String(date.getMonth() + 1).padStart(2, '0')
    const D = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    const f = String(date.getMilliseconds()).padStart(3, '0')

    let result = this.logFileNamePattern
      .replace(/%C/g, connName)
      .replace(/%R/g, remark || '')
      .replace(/%Y/g, Y)
      .replace(/%M/g, M)
      .replace(/%D/g, D)
      .replace(/%h/g, h)
      .replace(/%m/g, m)
      .replace(/%s/g, s)
      .replace(/%f/g, f)
      // 不补零版本
      .replace(/%MM/g, String(date.getMonth() + 1))
      .replace(/%DD/g, String(date.getDate()))
      .replace(/%hh/g, String(date.getHours()))
      .replace(/%mm/g, String(date.getMinutes()))
      .replace(/%ss/g, String(date.getSeconds()))
      .replace(/%fff/g, String(date.getMilliseconds()))

    // 日志文件名不能保留路径分隔符，Linux 串口名如 /dev/ttyUSB0 会被当成子目录。
    return result.replace(/[\\/\\*?:"<>|]/g, '-')
  }

  createConnLogFile(connId: string, connName: string, remark?: string): string {
    if (!this.enableLogStorage) {
      return ''
    }
    // 解析目录模板，创建对应的目录
    const resolvedDir = this.resolveDirName(connName, remark)
    this.ensureDir(resolvedDir)
    this.connLogDirs.set(connId, resolvedDir)
    // 同时更新全局 logDir（用于 openLogDir 等无连接上下文的操作）
    this.logDir = resolvedDir

    const fileName = `${this.resolveFileName(connName, remark)}.log`
    this.connLogFiles.set(connId, fileName)
    this.connLogFileHistory.set(connId, [fileName])
    this.connLogBaseNames.set(connId, fileName.replace(/\.log$/, ''))
    this.connLogIndexes.set(connId, 0)
    this.connLogNames.set(connId, connName) // 保存原始连接名
    if (remark) {
      this.connLogRemarks.set(connId, remark)
    }
    this.logCache.set(connId, [])
    this.currentFileSizes.set(connId, 0)

    // 连接时立即创建空日志文件，避免刚连接时点击打开日志提示文件不存在
    const logFilePath = join(resolvedDir, fileName)
    this.ensureDir(dirname(logFilePath))
    if (!existsSync(logFilePath)) {
      writeFileSync(logFilePath, '', 'utf-8')
    }

    return fileName
  }

  writeToConnLog(data: string, connId: string): void {
    if (!this.enableLogStorage) return
    const fileName = this.connLogFiles.get(connId)
    if (!fileName) return

    // 检查磁盘空间，空间不足时停止写入
    if (!this.checkDiskSpace()) {
      return // 磁盘空间不足，丢弃数据
    }

    const currentLogs = this.logCache.get(connId) || []
    const timestamp = this.getTimeStamp()

    // 先拆分数据，每行作为独立项，过滤空行
    const lines = data.split(/\r?\n/).filter((line) => line.trim() !== '')
    for (const line of lines) {
      currentLogs.push(`[${timestamp}] ${line}`)
    }

    this.logCache.set(connId, currentLogs)
  }

  // 直接追加日志文本。若传入内容只在整段开头带时间戳，拆行后为每一行补同一个时间戳。
  appendToConnLog(content: string, connId: string): void {
    if (!this.enableLogStorage) return
    const fileName = this.connLogFiles.get(connId)
    if (!fileName) return

    // 检查磁盘空间，空间不足时停止写入
    if (!this.checkDiskSpace()) {
      return // 磁盘空间不足，丢弃数据
    }

    const currentLogs = this.logCache.get(connId) || []
    const timestampMatch = content.match(/^(\[\d{4}-\d{2}-\d{2}\s[^\]]+\]\s*)/)
    const timestampPrefix = timestampMatch ? timestampMatch[1] : `[${this.getTimeStamp()}] `
    const logContent = timestampMatch ? content.slice(timestampPrefix.length) : content
    const lines = logContent.split(/\r?\n/).filter((line) => line.trim() !== '')
    for (const line of lines) {
      currentLogs.push(/^\[\d{4}-\d{2}-\d{2}\s/.test(line) ? line : `${timestampPrefix}${line}`)
    }
    this.logCache.set(connId, currentLogs)
  }

  // 连接关闭时刷入日志（保留记录以便后续打开日志）
  flushConnLog(connId: string): void {
    // 先处理失败缓存
    const failedLogs = this.failedCache.get(connId)
    if (failedLogs && failedLogs.length > 0) {
      const allLogs = [...failedLogs, ...(this.logCache.get(connId) || [])]
      this.logCache.set(connId, allLogs)
      this.failedCache.delete(connId)
    }

    const remainingLogs = this.logCache.get(connId)
    if (remainingLogs && remainingLogs.length > 0) {
      const fileName = this.connLogFiles.get(connId)
      if (fileName) {
        const logFile = join(this.getConnLogDir(connId), fileName)
        const logData = remainingLogs.join('\n') + '\n'
        try {
          this.ensureDir(dirname(logFile))
          appendFileSync(logFile, logData, 'utf-8') // 同步写入
        } catch (err) {
          console.error(`Flush log on disconnect failed:`, err)
        }
      }
    }
    this.logCache.delete(connId)
  }

  // 真正清理日志记录（选项卡关闭时调用）
  clearConnLogFile(connId: string): void {
    this.flushConnLog(connId)
    this.connLogFiles.delete(connId)
    this.connLogFileHistory.delete(connId)
    this.connLogBaseNames.delete(connId)
    this.connLogDirs.delete(connId)
    this.connLogIndexes.delete(connId)
    this.connLogNames.delete(connId)
    this.connLogRemarks.delete(connId)
    this.currentFileSizes.delete(connId)
    this.failedCache.delete(connId)
  }

  async openConnLog(connId: string, mode: 'folder' | 'file' = 'folder'): Promise<{ success: boolean; message: string } | null> {
    try {
      // 未启用日志存储时，直接提示
      if (!this.enableLogStorage) {
        return { success: false, message: 'Log storage is not enabled, please enable it in settings' }
      }

      this.flushAllLogs(false)

      const fileName = this.connLogFiles.get(connId)
      if (!fileName) {
        return { success: false, message: 'Connection log not found' }
      }

      const logFilePath = join(this.getConnLogDir(connId), fileName)
      if (!existsSync(logFilePath)) {
        return { success: false, message: 'Log file does not exist' }
      }

      if (shell && !(app as any).isQuitting) {
        if (mode === 'file') {
          await shell.openPath(logFilePath)
        } else {
          await shell.showItemInFolder(logFilePath)
        }
      }
      return { success: true, message: '' }
    } catch (error) {
      console.error('Failed to open log:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open log file'
      }
    }
  }

  async openLogDir(): Promise<{ success: boolean; message: string } | null> {
    try {
      this.flushAllLogs(false)

      if (!existsSync(this.logDir)) {
        return { success: false, message: 'Log directory does not exist' }
      }

      if (shell && !(app as any).isQuitting) {
        await shell.openPath(this.logDir)
      }
      return { success: true, message: '' }
    } catch (error) {
      console.error('Failed to open log directory:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open log directory'
      }
    }
  }

  async getLogFilePath(connId: string): Promise<{ success: boolean; filePath?: string; message?: string }> {
    try {
      this.flushAllLogs(false)

      const fileName = this.connLogFiles.get(connId)
      if (!fileName) {
        return { success: false, message: 'Log file not found' }
      }

      const logFilePath = join(this.getConnLogDir(connId), fileName)
      return { success: true, filePath: logFilePath }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get log file path'
      }
    }
  }

  async copyLogFile(
    connId: string,
    destPath: string,
    onProgress?: (percent: number) => void,
    options?: { hours?: number }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      this.flushAllLogs(true) // 确保所有日志都已写入

      const fileNames = this.connLogFileHistory.get(connId) || []
      if (fileNames.length === 0) {
        return { success: false, message: 'Log file not found' }
      }

      const logDir = this.getConnLogDir(connId)
      await fs.mkdir(dirname(destPath), { recursive: true })

      // 如果指定了时间范围，按时间筛选
      if (options?.hours && options.hours > 0) {
        return await this.copyLogFileWithTimeRange(connId, destPath, options.hours, onProgress)
      }

      // 全部导出
      await fs.writeFile(destPath, '', 'utf-8')

      // 收集有效文件并计算总大小
      const validFiles: { path: string; size: number }[] = []
      let totalSize = 0
      for (const fileName of fileNames) {
        const sourcePath = join(logDir, fileName)
        if (existsSync(sourcePath)) {
          const stats = statSync(sourcePath)
          validFiles.push({ path: sourcePath, size: stats.size })
          totalSize += stats.size
        }
      }

      if (validFiles.length === 0) {
        return { success: false, message: 'Source log file does not exist' }
      }

      // 逐个文件复制并报告进度
      let copiedSize = 0
      for (const file of validFiles) {
        const content = await fs.readFile(file.path)
        await fs.appendFile(destPath, content)
        copiedSize += file.size
        // 报告进度
        if (onProgress && totalSize > 0) {
          onProgress(Math.min(100, Math.round((copiedSize / totalSize) * 100)))
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to copy log file:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to copy log file'
      }
    }
  }

  // 按时间范围导出日志
  private async copyLogFileWithTimeRange(
    connId: string,
    destPath: string,
    hours: number,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; message?: string }> {
    const fileNames = this.connLogFileHistory.get(connId) || []
    const logDir = this.getConnLogDir(connId)
    const cutoff = Date.now() - hours * 60 * 60 * 1000
    const timestampRegex = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/

    // 收集有效文件
    const validFiles: string[] = []
    for (const fileName of fileNames) {
      const sourcePath = join(logDir, fileName)
      if (existsSync(sourcePath)) {
        validFiles.push(sourcePath)
      }
    }

    if (validFiles.length === 0) {
      return { success: false, message: 'Source log file does not exist' }
    }

    // 读取并筛选内容
    let totalContent = ''
    let processedFiles = 0

    for (const filePath of validFiles) {
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n')

      // 按行匹配时间戳进行筛选
      const filtered = lines.filter(line => {
        const match = line.match(timestampRegex)
        if (!match) return true // 保留无时间戳的行（如连接信息）
        try {
          const lineTime = new Date(match[1]).getTime()
          return lineTime >= cutoff
        } catch {
          return true // 解析失败时保留
        }
      })

      if (filtered.length > 0) {
        totalContent += filtered.join('\n') + '\n'
      }

      processedFiles++
      if (onProgress) {
        onProgress(Math.min(99, Math.round((processedFiles / validFiles.length) * 100)))
      }
    }

    // 写入目标文件
    await fs.writeFile(destPath, totalContent.trimEnd() + '\n', 'utf-8')
    if (onProgress) onProgress(100)

    return { success: true }
  }

  // 日志归档：保留旧文件不动，创建新日志文件继续写入
  // 后续的日志写入、打开文件/文件夹操作都指向新文件
  async rotateLogFile(connId: string): Promise<{ success: boolean; message?: string; oldFileName?: string; newFileName?: string }> {
    try {
      this.flushAllLogs(true) // 确保所有日志都已写入

      const oldFileName = this.connLogFiles.get(connId)
      if (!oldFileName) {
        return { success: false, message: 'Log file not found' }
      }

      const connName = this.connLogNames.get(connId) || 'unknown'
      const remark = this.connLogRemarks.get(connId)
      const logDir = this.getConnLogDir(connId)

      // 用 resolveFileName 生成新文件名（与断开重连时的规则一致）
      let newLogFileName = `${this.resolveFileName(connName, remark)}.log`
      let newLogPath = join(logDir, newLogFileName)

      // 如果目标文件已存在，追加序号避免覆盖
      let counter = 1
      while (existsSync(newLogPath)) {
        newLogFileName = `${this.resolveFileName(connName, remark)}-${counter}.log`
        newLogPath = join(logDir, newLogFileName)
        counter++
      }

      // 创建新的空日志文件
      writeFileSync(newLogPath, '', 'utf-8')

      // 更新内部映射，后续写入和打开操作都指向新文件
      this.connLogFiles.set(connId, newLogFileName)
      this.connLogFileHistory.set(connId, [...(this.connLogFileHistory.get(connId) || []), newLogFileName])
      this.connLogBaseNames.set(connId, newLogFileName.replace(/\.log$/, ''))
      this.connLogIndexes.set(connId, 0)
      this.currentFileSizes.set(connId, 0)

      return {
        success: true,
        oldFileName: oldFileName,
        newFileName: newLogFileName
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to rotate log file'
      }
    }
  }
}
