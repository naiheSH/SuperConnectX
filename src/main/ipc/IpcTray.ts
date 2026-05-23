import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import { join, dirname } from 'path'
import logger from './IpcAppLogger'

export default class IpcTray {
  private static sInstance: IpcTray
  private tray: Tray | null = null

  constructor() {
  }

  static getInstance(): IpcTray {
    if (IpcTray.sInstance == null) {
      IpcTray.sInstance = new IpcTray()
    }
    return IpcTray.sInstance
  }

  private getIconPath(): string {
    // 根据平台返回图标路径
    const basePath = app.isPackaged
      ? (process.platform === 'win32'
          ? dirname(app.getPath('exe'))   // 与 exe 同目录
          : process.resourcesPath)        // macOS/Linux: Resources 目录
      : join(__dirname, '../../build')    // 开发模式: build 目录

    if (process.platform === 'win32') {
      return join(basePath, 'icon.ico')
    } else if (process.platform === 'darwin') {
      return join(basePath, 'icon.icns')
    }
    return join(basePath, 'icon.png')
  }

  createTray(mainWindow: BrowserWindow): void {
    if (this.tray) {
      return
    }

    const iconPath = this.getIconPath()
    let icon = nativeImage.createFromPath(iconPath)

    if (icon.isEmpty()) {
      logger.warn(`Tray icon not found at: ${iconPath}, using default 16x16 icon`)
      // 创建一张简单的 16x16 占位图标，避免托盘图标完全空白
      icon = nativeImage.createEmpty()
    }
    
    // Windows 上使用 16x16 或 32x32 的图标
    if (process.platform === 'win32') {
      this.tray = new Tray(icon.resize({ width: 16, height: 16 }))
    } else {
      this.tray = new Tray(icon.resize({ width: 22, height: 22 }))
    }

    this.tray.setToolTip('SuperConnectX')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          this.showWindow(mainWindow)
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          (app as any).isQuitting = true
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)

    // 点击托盘图标显示窗口
    this.tray.on('click', () => {
      this.showWindow(mainWindow)
    })

    logger.info('Tray created successfully')
  }

  private showWindow(mainWindow: BrowserWindow): void {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.show()
      mainWindow.focus()
    }
  }

  hideToTray(mainWindow: BrowserWindow): void {
    // 创建托盘（如果还没有）
    if (!this.tray) {
      this.createTray(mainWindow)
    }
    // 隐藏窗口
    mainWindow.hide()
    logger.info('Window hidden to tray')
  }

  destroyTray(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
      logger.info('Tray destroyed')
    }
  }

  isQuitting(): boolean {
    return (app as any).isQuitting === true
  }
}
