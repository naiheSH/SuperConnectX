/**
 * AppDir - 应用数据目录
 *
 * 统一使用 Electron 的 userData 目录存放所有用户数据：
 * - 日志、备份、终端日志、用户数据均在此目录下
 * - 首次启动时，若 EXE 同目录存在旧数据，自动迁移并删除
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
 * 获取应用数据根目录
 *
 * 统一使用 electron userData 目录
 */
export function getAppDataDir(): string {
  return app.getPath('userData')
}

/**
 * 初始化应用目录结构
 *
 * 策略：
 * 1. 通过 app.setPath 将 Electron 标准路径重定向到子目录
 * 2. 通过命令行参数控制 Chromium 内部缓存路径
 * 3. 在 app.whenReady() 后调用 cleanupChromiumClutter() 清理
 *    Chromium 在 userData 根目录留下的杂散目录
 *
 * **initAppPaths() 必须在 app.whenReady() 之前调用。**
 * **cleanupChromiumClutter() 在 app.whenReady() 之后调用。**
 */
export function initAppPaths(): void {
  const userData = getAppDataDir()

  // 将 Chromium 运行时数据集中到 _runtime/ 子目录下
  const runtimeDir = path.join(userData, '_runtime')

  // 注意：app.setPath('cache', ...) 或 app.setPath('sessionData', ...)
  // 不能重定向到 userData 的子目录，因为 Chromium 会在这些目录下创建以
  // 应用名命名的子目录，并可能把 userData 也重定向过去（如 _runtime/Cache/superconnectx）。
  //
  // 解决方案：将 sessionData 放到 userData 的**兄弟目录**，而非子目录。
  // 这样 Chromium 的 Local Storage、blob_storage 等杂散文件不会污染 userData 根目录，
  // 也不会影响 app.getPath('userData') 的返回值。
  const sessionDir = path.join(path.dirname(userData), 'superconnectx-session')
  try {
    app.setPath('sessionData', sessionDir)
  } catch {
    // ignore
  }

  // 命令行参数：控制 Chromium 磁盘缓存和 GPU 缓存位置
  app.commandLine.appendSwitch('disk-cache-dir', path.join(runtimeDir, 'Cache'))
  app.commandLine.appendSwitch('gpu-disk-cache-dir', path.join(runtimeDir, 'GPUCache'))

  // crashDumps 可以安全重定向，它不会影响 userData
  try {
    app.setPath('crashDumps', path.join(runtimeDir, 'CrashDumps'))
  } catch {
    // ignore
  }

  // 确保业务目录存在
  const bizDirs = ['app-logs', 'logs']
  for (const dir of bizDirs) {
    const dirPath = path.join(userData, dir)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }
}

/**
 * Chromium 在 userData 根目录下会残留的杂散目录/文件列表。
 *
 * 虽然我们通过 app.setPath 和命令行参数尽量重定向，但 Chromium
 * 仍然可能在 userData 下直接创建一些目录。这些目录在应用退出后可以安全删除。
 */
const CHROMIUM_CLUTTER_PATTERNS = [
  'DawnGraphiteCache',
  'DawnCache',
  'GPUCache',
  'blob_storage',
  'Code Cache',
  'Local Storage',
  'shared_proto_db',
  'Network Persistent State',
  'Platform Notifications',
  'TransportSecurity',
  'Trust Tokens',
  'Trust Tokens-journal',
  'WebStorage',
  'VideoDecodeStats',
  'ShaderCache',
  'Crashpad',
  'CrashpadMetrics-active.pma',
  'CrashpadMetrics.pma',
  'First Run',
  'Last Version',
  'Local State',
  'lockfile',
  'Variations',
  'BrowserMetrics',
  'component_crx_cache',
  'OriginTrials',
  'Subresource Filter',
  'Safe Browsing',
  'Segmentation Platform',
  'OptimizationGuidePredictionModelDownloads',
  'Crowd Deny',
  'FileTypePolicies',
  'FirstPartySets',
  'MEIPreload',
  'PKIMetadata',
  'PrivacySandboxAttestationsPreloaded',
  'SafetyTips',
  'SSLErrorAssistant',
  'TpcdMetadata',
  'WasmTtsEngine',
  'ZxcvbnData',
  'hyphen-data',
  'AutofillStates',
  'OnDeviceHeadSuggestModel',
  'OpenCookieDatabase',
  'MediaFoundationWidevineCdm',
  'WidevineCdm',
]

/**
 * 清理 Chromium 在 userData 根目录下残留的杂散目录/文件。
 *
 * 必须在 app.whenReady() 之后调用，因为某些目录可能在启动过程中才被创建。
 * 只删除已知的 Chromium 内部目录/文件，不删除业务目录（logs、app-logs、userdata、backup 等）。
 *
 * 注意：运行时 Chromium 可能正在使用某些目录（如 GPUCache），
 * 所以这个方法清理的是上次运行残留的目录。新产生的目录需要等下次启动时清理。
 */
export function cleanupChromiumClutter(logger?: { info: (msg: string) => void }): void {
  const userData = getAppDataDir()

  // 1. 清理 userData 根目录下的 Chromium 杂散目录/文件
  for (const name of CHROMIUM_CLUTTER_PATTERNS) {
    const fullPath = path.join(userData, name)
    try {
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true })
        logger?.info(`[AppDir] cleaned up Chromium clutter: ${name}`)
      }
    } catch {
      // 某些文件可能被 Chromium 进程锁定，跳过即可
    }
  }

  // 2. 清理 _runtime 子目录下可能残留的业务数据目录
  //    旧版本代码可能把 userdata、logs 等写到了 _runtime/Cache/superconnectx 下
  const runtimeDir = path.join(userData, '_runtime')
  const bizDirNames = ['userdata', 'backup', 'logs', 'app-logs']
  if (fs.existsSync(runtimeDir)) {
    try {
      _cleanupBizDirsInDir(runtimeDir, bizDirNames, logger)
    } catch {
      // ignore
    }
  }
}

/**
 * 递归清理目录树中残留的业务数据目录（userdata、logs 等）
 */
function _cleanupBizDirsInDir(
  dir: string,
  bizDirNames: string[],
  logger?: { info: (msg: string) => void }
): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (!entry.isDirectory()) continue

    if (bizDirNames.includes(entry.name)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true })
        logger?.info(`[AppDir] cleaned up stray biz dir in _runtime: ${fullPath}`)
      } catch {
        // ignore
      }
    } else {
      // 递归进入子目录继续查找
      _cleanupBizDirsInDir(fullPath, bizDirNames, logger)
    }
  }
}

/**
 * 拷贝目录（递归）
 */
function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * 获取可能包含旧数据的源目录列表
 *
 * 开发环境：exe 在 node_modules/electron/dist/，旧数据在项目根目录
 * 打包环境：exe 在安装目录，旧数据在 exe 同目录
 * 此外也检查 app.getAppPath()（asar 打包时指向 app.asar 所在目录）
 */
function getLegacyDataDirs(): string[] {
  const dirs: string[] = []
  const exeDir = getExeDir()

  // 1. EXE 所在目录（打包环境）
  dirs.push(exeDir)

  // 2. app.getAppPath()（开发环境是项目根目录，打包后是 resources/app.asar 所在目录）
  try {
    const appPath = app.getAppPath()
    const appDir = appPath.endsWith('.asar') ? path.dirname(appPath) : appPath
    if (path.resolve(appDir).toUpperCase() !== path.resolve(exeDir).toUpperCase()) {
      dirs.push(appDir)
    }
  } catch {
    // ignore
  }

  return dirs
}

/**
 * 迁移旧数据目录从 exe/app 目录到 appDataDir
 *
 * 检查 exe 目录和 app.getAppPath() 目录下是否存在旧的 userdata/、backup/ 目录，
 * 将其内容拷贝到 userData 目录下，并删除旧目录。
 *
 * @param logger 可选的日志函数，用于记录迁移过程
 */
export function migrateDataIfNeeded(logger?: { info: (msg: string) => void }): void {
  const appDataDir = getAppDataDir()
  const legacyDirs = getLegacyDataDirs()

  const dirsToMigrate = ['userdata', 'backup', 'logs', 'app-logs']

  for (const legacyDir of legacyDirs) {
    // 如果 legacyDir 就是目标目录，跳过
    if (path.resolve(legacyDir).toUpperCase() === path.resolve(appDataDir).toUpperCase()) {
      continue
    }

    for (const dirName of dirsToMigrate) {
      const oldDir = path.join(legacyDir, dirName)
      const newDir = path.join(appDataDir, dirName)

      if (!fs.existsSync(oldDir)) {
        continue
      }

      // 如果新目录已存在，覆盖拷贝
      if (fs.existsSync(newDir)) {
        logger?.info(`[AppDir] migrate overwrite (target exists): ${dirName} from ${oldDir}`)
        try {
          copyDirSync(oldDir, newDir)
          logger?.info(`[AppDir] migrated: ${oldDir} -> ${newDir}`)
          fs.rmSync(oldDir, { recursive: true, force: true })
          logger?.info(`[AppDir] removed old dir: ${oldDir}`)
        } catch (err) {
          logger?.info(`[AppDir] migrate failed: ${dirName} - ${err}`)
        }
        continue
      }

      try {
        copyDirSync(oldDir, newDir)
        logger?.info(`[AppDir] migrated: ${oldDir} -> ${newDir}`)
        // 迁移成功后删除旧目录
        fs.rmSync(oldDir, { recursive: true, force: true })
        logger?.info(`[AppDir] removed old dir: ${oldDir}`)
      } catch (err) {
        logger?.info(`[AppDir] migrate failed: ${dirName} - ${err}`)
      }
    }

    // 迁移完成后，如果 legacyDir 已经为空，删除它
    try {
      const remaining = fs.readdirSync(legacyDir)
      if (remaining.length === 0) {
        fs.rmdirSync(legacyDir)
        logger?.info(`[AppDir] removed empty legacy dir: ${legacyDir}`)
      }
    } catch {
      // ignore
    }
  }
}
