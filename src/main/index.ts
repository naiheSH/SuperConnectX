import { BrowserWindow, app, ipcMain } from 'electron'
import ProtocolLogger from './utils/ProtocolLogger'
import IpcStorage from './ipc/IpcStorage'
import IpcConnector from './ipc/IpcConnector'
import IpcWindow from './ipc/IpcWindow'
import IpcTools from './ipc/IpcTools'
import IpcSerialPort from './ipc/IpcSerialPort'
import IpcVirtualPort from './ipc/IpcVirtualPort'
import IpcMain from './ipc/IpcMain'
import IpcDataCheck from './ipc/IpcDataCheck'
import AppUpdater from './updater/AppUpdater'
import logger from './ipc/IpcAppLogger'
import { migrateDataIfNeeded, initAppPaths, cleanupChromiumClutter, getInstanceIndex } from './utils/AppDir'
import McpHttpServer from './mcp/McpHttpServer'
import SuperConnectXMcpFacade from './mcp/SuperConnectXMcpFacade'
import { McpTemplateRegistry } from './mcp/McpTemplateRegistry'
import { join } from 'node:path'
import { mkdir, copyFile, readFile } from 'node:fs/promises'
import SettingsStorage from './storage/SettingsStorage'
import { DEFAULT_MCP_PERMISSION_POLICY, type McpPermissionPolicy } from '../shared/mcp/McpTypes'

// 禁用 Chromium 自动网络请求，避免公司内网代理环境触发安全告警（同步上游 83a8ac6）
app.commandLine.appendSwitch('disable-component-update')         // 禁用组件更新
app.commandLine.appendSwitch('disable-features', 'InterestFeedContentSuggestions')  // 禁用内容建议
app.commandLine.appendSwitch('disable-background-networking')   // 禁用后台网络（仅 Chromium 内核有效）

// 必须在 app.whenReady() 之前调用，将 Electron 内置路径（Cache、CrashDumps 等）
// 重定向到 userData 子目录，避免根目录散乱
initAppPaths()

const instanceIdx = getInstanceIndex()

const protocolLogger = new ProtocolLogger()
const windows = { mainWindow: undefined as BrowserWindow | undefined }
let mcpHttpServer: McpHttpServer | null = null
const mcpTemplateRegistry = new McpTemplateRegistry()
const settingsStorage = new SettingsStorage()
const mcpFacade = new SuperConnectXMcpFacade(mcpTemplateRegistry)
const getMcpPolicy = (): McpPermissionPolicy => {
  const settings = settingsStorage.getSettings()
  const mode = settings.mcpAccessMode ?? 'read-only'
  return {
    ...DEFAULT_MCP_PERMISSION_POLICY,
    write: mode === 'read-write' || mode === 'full',
    destructive: mode === 'full',
    export: Boolean(settings.mcpAllowExport) && mode === 'full'
  }
}
const startMcpRuntime = async (): Promise<boolean> => {
  const settings = settingsStorage.getSettings()
  if (!settings.mcpEnabled) return false
  if (!mcpHttpServer) mcpHttpServer = new McpHttpServer(mcpFacade, process.env.SCX_MCP_TOKEN, getMcpPolicy())
  if (mcpHttpServer.status.enabled) return true
  await mcpHttpServer.start(Number(settings.mcpPort ?? 32180))
  logger.info(`[MCP] enabled at ${mcpHttpServer.endpoint}`)
  return true
}
const stopMcpRuntime = async (): Promise<boolean> => {
  if (!mcpHttpServer) return true
  await mcpHttpServer.close()
  return true
}
ipcMain.handle('mcp:get-status', () => mcpHttpServer?.status ?? { enabled: false, port: null, endpoint: null })
ipcMain.handle('mcp:get-client-config', () => mcpHttpServer?.getClientConfig() ?? { endpoint: null, token: null })
ipcMain.handle('mcp:rotate-token', () => mcpHttpServer?.rotateToken() ?? null)
ipcMain.handle('mcp:get-settings', () => { const s = settingsStorage.getSettings(); return { enabled: Boolean(s.mcpEnabled), port: Number(s.mcpPort ?? 32180), accessMode: s.mcpAccessMode ?? 'read-only', allowExport: Boolean(s.mcpAllowExport) } })
ipcMain.handle('mcp:save-settings', async (_, input) => {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const port = Number(value.port)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('端口必须在 1024-65535 之间')
  const accessMode = value.accessMode === 'read-write' || value.accessMode === 'full' ? value.accessMode : 'read-only'
  const enabled = value.enabled === true
  settingsStorage.saveSettings({ mcpEnabled: enabled, mcpPort: port, mcpAccessMode: accessMode, mcpAllowExport: value.allowExport === true })
  const wasRunning = Boolean(mcpHttpServer?.status.enabled)
  const oldPort = mcpHttpServer?.status.port
  if (mcpHttpServer) mcpHttpServer.setPermissionPolicy(getMcpPolicy())
  if (wasRunning && oldPort !== port) await stopMcpRuntime()
  if (enabled) await startMcpRuntime(); else await stopMcpRuntime()
  return true
})
ipcMain.handle('mcp:start', async () => { settingsStorage.saveSettings({ mcpEnabled: true }); return startMcpRuntime() })
ipcMain.handle('mcp:stop', async () => { settingsStorage.saveSettings({ mcpEnabled: false }); return stopMcpRuntime() })
ipcMain.handle('mcp:import-template', async (_, filePath: string) => {
  if (typeof filePath !== 'string' || !filePath.toLowerCase().endsWith('.json')) throw new Error('模板必须是 JSON 文件')
  const parsed = JSON.parse(await readFile(filePath, 'utf8'))
  const template = mcpTemplateRegistry.register(parsed)
  const targetDir = join(app.getPath('userData'), 'mcp', 'templates')
  await mkdir(targetDir, { recursive: true })
  await copyFile(filePath, join(targetDir, `${template.id}.json`))
  return { id: template.id, version: template.version, name: template.name }
})

logger.info(`======== start superconnect-x (instance ${instanceIdx}) ========`)
logger.info(JSON.stringify(IpcMain.getInstance().getVersionInfo()))

// 迁移旧数据：如果 EXE 目录下存在旧的 userdata/backup，拷贝到 appDataDir 并删除旧目录
migrateDataIfNeeded(logger)

IpcStorage.getInstance().init()
IpcConnector.getInstance().init(protocolLogger, windows)
IpcWindow.getInstance().init(windows)
IpcTools.getInstance().init(windows)
IpcSerialPort.getInstance().init(protocolLogger, windows)
IpcVirtualPort.getInstance().init(protocolLogger, windows)
IpcMain.getInstance().init(protocolLogger, windows)
IpcDataCheck.getInstance().init()

// Developer templates are loaded from the packaged resources and the user's
// writable profile. Invalid files are isolated and reported without blocking
// application startup; later MCP tools can consume the registry.
app.whenReady().then(async () => {
  const templateDirectories = [
    join(app.getAppPath(), 'resources', 'mcp', 'templates'),
    join(app.getPath('userData'), 'mcp', 'templates'),
    join(process.cwd(), '.superconnectx', 'templates')
  ]
  for (const directory of templateDirectories) {
    try {
      const result = await mcpTemplateRegistry.loadDirectory(directory)
      if (result.loaded.length || result.skipped.length) {
        logger.info(`[MCP] templates loaded=${result.loaded.length} skipped=${result.skipped.length} dir=${directory}`)
      }
    } catch (error) {
      logger.warn(`[MCP] template directory unavailable: ${directory} (${error instanceof Error ? error.message : error})`)
    }
  }
})

// MCP 默认关闭；兼容旧的启动参数，同时支持设置页启停。
const mcpPortArgument = process.argv.find((argument) => argument.startsWith('--mcp-port='))?.split('=')[1]
const mcpPortValue = mcpPortArgument ?? process.env.SCX_MCP_PORT
if (mcpPortValue) {
  const mcpPort = Number.parseInt(mcpPortValue, 10)
  mcpHttpServer = new McpHttpServer(mcpFacade, process.env.SCX_MCP_TOKEN, getMcpPolicy())
  app.whenReady().then(async () => {
    try {
      const info = await mcpHttpServer!.start(mcpPort)
      logger.info(`[MCP] enabled at ${info.endpoint}`)
    } catch (error) {
      logger.error(`[MCP] failed to start: ${error instanceof Error ? error.message : error}`)
      mcpHttpServer = null
    }
  })
}
app.whenReady().then(() => { if (!mcpPortValue) void startMcpRuntime().catch((error) => logger.error(`[MCP] failed to start: ${error instanceof Error ? error.message : error}`)) })

// 初始化自动更新（窗口创建后）；开发环境不联网检查，生产包按产品意图自动检查。
if (app.isPackaged) {
  app.whenReady().then(() => {
    if (windows.mainWindow) {
      AppUpdater.getInstance().init(windows.mainWindow)
      logger.info('[Updater] Auto-updater module initialized')
      // 启动后延迟检查更新（5秒后，避免影响启动速度）
      setTimeout(() => {
        AppUpdater.getInstance().checkForUpdates()
      }, 5000)
    }
  })
}

// 清理 Chromium 在 userData 根目录下残留的杂散目录
app.whenReady().then(() => {
  cleanupChromiumClutter(logger)
})

app.on('before-quit', () => {
  void mcpHttpServer?.close()
})

logger.info(`======== start superconnect-x ok (instance ${instanceIdx}) ========`)
