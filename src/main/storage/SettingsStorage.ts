import Store from 'electron-store'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import logger from '../ipc/IpcAppLogger'

const SAVE_DIR_NAME = 'userdata'

interface SyntaxSubRule {
  id: number
  matchType: 'regex' | 'keyword'
  pattern: string
  caseSensitive: boolean
  foreground: string
  background: string
  bold: boolean
  italic: boolean
  underline: boolean
}

interface SyntaxRuleGroup {
  id: number
  name: string
  enabled: boolean
  subRules: SyntaxSubRule[]
  previewText?: string
}

interface Settings {
  // 基本设置
  minimizeToTray?: boolean
  logSplit?: boolean
  logSplitSize?: number
  autoScroll?: boolean
  autoScrollToast?: boolean
  autoScrollOnFocus?: boolean
  autoScrollAfterSend?: boolean
  autoScrollOnWheel?: boolean
  language?: string
  autoBackup?: boolean
  backupInterval?: number
  autoStart?: boolean
  preventSleep?: boolean
  maxDisplayText?: number
  // 串口设置
  supportedBaudRates?: number[]
  showPortType?: boolean
  // 日志
  enableLogStorage?: boolean
  logPath?: string
  logFileName?: string
  maxLogSize?: number
  logTimestamp?: boolean
  logHex?: boolean
  // 语法高亮
  enableSyntaxHighlight?: boolean
  syntaxRuleGroups?: SyntaxRuleGroup[]
  // 搜索
  searchCaseSensitive?: boolean
  searchRegex?: boolean
  searchWholeWord?: boolean
  // 命令历史
  commandHistoryMaxCount?: number
  showCommandHistory?: boolean
}

const defaultSettings: Settings = {
  // 基本设置
  minimizeToTray: false,
  logSplit: true,
  logSplitSize: 20,
  autoScroll: true,
  autoScrollToast: true,
  autoScrollOnFocus: true,
  autoScrollAfterSend: false,
  autoScrollOnWheel: true,
  language: 'zh-CN',
  autoBackup: true,
  backupInterval: 30,
  autoStart: false,
  preventSleep: false,
  maxDisplayText: 30,
  // 串口设置
  supportedBaudRates: [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1500000],
  showPortType: true,
  // 日志
  enableLogStorage: true,
  logPath: '',
  logFileName: '%C-%Y-%M-%D-%hh-%mm-%ss',
  maxLogSize: 50,
  logTimestamp: true,
  logHex: false,
  // 语法高亮
  enableSyntaxHighlight: true,
  syntaxRuleGroups: [
    {
      id: 1,
      name: '错误/警告/成功',
      enabled: true,
      previewText: '[2024-01-15 10:30:45] INFO  System started SUCCESS\n[2024-01-15 10:30:46] WARN  Connection timeout, retrying...\n[2024-01-15 10:30:47] ERROR Failed to connect: Network unreachable\n[2024-01-15 10:30:48] INFO  Connection OK, data transfer started\n[2024-01-15 10:30:49] SUCCESS All checks passed',
      subRules: [
        { id: 1, matchType: 'regex', pattern: '(ERROR|FAIL|异常|失败|error|fail)', caseSensitive: false, foreground: '#FF4444', background: '', bold: true, italic: false, underline: false },
        { id: 2, matchType: 'regex', pattern: '(WARN|WARNING|警告|warn)', caseSensitive: false, foreground: '#E6A23C', background: '', bold: false, italic: false, underline: false },
        { id: 3, matchType: 'regex', pattern: '(SUCCESS|成功|OK|ok)', caseSensitive: false, foreground: '#67C23A', background: '', bold: true, italic: false, underline: false }
      ]
    },
    {
      id: 2,
      name: 'IP地址高亮',
      enabled: true,
      previewText: 'Connecting to 192.168.1.1:8080...\nReceived response from 10.0.0.1\nDNS resolved: 8.8.8.8 -> google.com\nGateway: 192.168.1.254\nListening on 0.0.0.0:3000',
      subRules: [
        { id: 4, matchType: 'regex', pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}', caseSensitive: false, foreground: '#409EFF', background: '', bold: false, italic: false, underline: true }
      ]
    }
  ] as SyntaxRuleGroup[],
  // 搜索
  searchCaseSensitive: false,
  searchRegex: false,
  searchWholeWord: false,
  // 命令历史
  commandHistoryMaxCount: 10,
  showCommandHistory: true
}

export default class SettingsStorage {
  private storageData: Store<any>
  private readonly STORAGE_NAME = 'settings'

  constructor() {
    const cwd = this.getAppUserDataPath()
    this.storageData = new Store<any>({
      name: this.STORAGE_NAME,
      cwd,
      defaults: defaultSettings
    })
    logger.debug(`SettingsStorage initialized at: ${cwd}`)
  }

  private getAppUserDataPath(): string {
    const exePath = app.getPath('exe')
    let exeDir = path.dirname(exePath)
    if (process.platform === 'darwin') {
      exeDir = path.resolve(exeDir, '../../..')
    }

    const userDataPath = path.join(exeDir, SAVE_DIR_NAME)
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    return userDataPath
  }

  getSettings(): Settings {
    return { ...defaultSettings, ...this.storageData.store }
  }

  saveSettings(settings: Settings): void {
    Object.keys(settings).forEach((key) => {
      this.storageData.set(key, (settings as any)[key])
    })
  }

  getDefaults(): Settings {
    return { ...defaultSettings }
  }
}
