import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import logger from '../ipc/IpcAppLogger'

const BACKUP_DIR_NAME = 'backup'
const USERDATA_DIR_NAME = 'userdata'

export default class BackupManager {
  private static sInstance: BackupManager

  static getInstance(): BackupManager {
    if (BackupManager.sInstance == null) {
      BackupManager.sInstance = new BackupManager()
    }
    return BackupManager.sInstance
  }

  /**
   * 获取 exe 所在目录
   */
  private getAppDir(): string {
    const exePath = app.getPath('exe')
    let exeDir = path.dirname(exePath)
    if (process.platform === 'darwin') {
      exeDir = path.resolve(exeDir, '../../..')
    }
    return exeDir
  }

  /**
   * 获取 userdata 目录路径
   */
  private getUserDataPath(): string {
    return path.join(this.getAppDir(), USERDATA_DIR_NAME)
  }

  /**
   * 获取 backup 目录路径
   */
  private getBackupDir(): string {
    return path.join(this.getAppDir(), BACKUP_DIR_NAME)
  }

  /**
   * 确保目录存在
   */
  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }

  /**
   * 递归拷贝目录
   */
  private copyDirSync(src: string, dest: string): void {
    this.ensureDir(dest)
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        this.copyDirSync(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }

  /**
   * 获取今天的日期字符串，格式 YYYY-MM-DD
   */
  private getTodayStr(): string {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  /**
   * 解析日期字符串 YYYY-MM-DD 为 Date 对象
   */
  private parseDateStr(dateStr: string): Date | null {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return null
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }

  /**
   * 获取 backup 目录下最近的备份日期目录名
   * 返回日期字符串，如果没有则返回 null
   */
  private getLastBackupDate(): string | null {
    const backupDir = this.getBackupDir()
    if (!fs.existsSync(backupDir)) return null

    const entries = fs.readdirSync(backupDir, { withFileTypes: true })
    const dates: string[] = []
    for (const entry of entries) {
      if (entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
        dates.push(entry.name)
      }
    }
    if (dates.length === 0) return null

    // 按日期降序排列，取最新的
    dates.sort((a, b) => b.localeCompare(a))
    return dates[0]
  }

  /**
   * 计算两个日期字符串之间的天数差
   */
  private daysBetween(dateStr1: string, dateStr2: string): number {
    const d1 = this.parseDateStr(dateStr1)
    const d2 = this.parseDateStr(dateStr2)
    if (!d1 || !d2) return Infinity
    return Math.abs(Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
  }

  /**
   * 检查是否需要备份
   * @param backupInterval 备份周期（天）
   * @returns true 表示需要备份
   */
  private shouldBackup(backupInterval: number): boolean {
    const lastDate = this.getLastBackupDate()
    if (!lastDate) {
      // 从未备份过，需要备份
      return true
    }
    const today = this.getTodayStr()
    const diff = this.daysBetween(lastDate, today)
    return diff >= backupInterval
  }

  /**
   * 执行备份：将 userdata 目录拷贝到 backup/YYYY-MM-DD 目录
   */
  performBackup(backupInterval: number): void {
    const userDataPath = this.getUserDataPath()
    if (!fs.existsSync(userDataPath)) {
      logger.info('[BackupManager] userdata directory not found, skip backup')
      return
    }

    if (!this.shouldBackup(backupInterval)) {
      logger.info(`[BackupManager] backup not needed (interval: ${backupInterval} days)`)
      return
    }

    try {
      const backupDir = this.getBackupDir()
      this.ensureDir(backupDir)

      const todayStr = this.getTodayStr()
      const destDir = path.join(backupDir, todayStr)

      // 如果今天的备份已存在，先删除再重新备份
      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true })
      }

      this.copyDirSync(userDataPath, destDir)
      logger.info(`[BackupManager] backup completed: ${destDir}`)
    } catch (error) {
      logger.error(`[BackupManager] backup failed:`, error)
    }
  }
}
