/**
 * AppDir - 智能应用数据目录选择
 *
 * 逻辑：
 * - 先尝试 exe 所在目录，检查是否有写权限
 * - 如果 exe 在系统盘（Windows C 盘）或无写权限，则回退到 electron userData 目录
 */
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

/**
 * 获取 exe 所在目录（兼容 macOS 的 .app bundle 结构）
 */
export function getExeDir(): string {
  const exePath = app.getPath('exe')
  let exeDir = path.dirname(exePath)
  if (process.platform === 'darwin') {
    exeDir = path.resolve(exeDir, '../../..')
  }
  return exeDir
}

/**
 * 检查目录是否可写
 */
function isDirWritable(dirPath: string): boolean {
  try {
    const testFile = path.join(dirPath, '.scx_write_test')
    fs.writeFileSync(testFile, 'test', { flag: 'w' })
    fs.unlinkSync(testFile)
    return true
  } catch {
    return false
  }
}

/**
 * 判断路径是否在 Windows 系统盘（C 盘）上
 */
function isOnSystemDrive(dirPath: string): boolean {
  if (process.platform !== 'win32') return false
  const normalized = path.resolve(dirPath).toUpperCase()
  return normalized.startsWith('C:\\') || normalized.startsWith('C:/')
}

/**
 * 获取智能应用数据根目录
 *
 * 优先级：
 * 1. exe 所在目录（如果在非系统盘且有写权限）
 * 2. electron userData 目录（回退方案）
 *
 * @returns 可用的应用数据根目录路径
 */
export function getAppDataDir(): string {
  const exeDir = getExeDir()

  // 检查 exe 目录是否可用
  const onSystemDrive = isOnSystemDrive(exeDir)
  const writable = isDirWritable(exeDir)

  if (!onSystemDrive && writable) {
    // exe 不在系统盘且有写权限，使用 exe 目录（便携模式）
    return exeDir
  }

  // 回退到 electron userData 目录
  return app.getPath('userData')
}
