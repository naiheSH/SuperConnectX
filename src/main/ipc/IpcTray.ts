import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import { join } from 'path'
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
      ? process.resourcesPath              // 打包后: resources/ 目录
      : join(__dirname, '../../build')     // 开发模式: build/ 目录

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
    const icon = nativeImage.createFromPath(iconPath)

    if (icon.isEmpty()) {
      logger.warn(`Tray icon not found at: ${iconPath}, using default icon`)
      this.tray = new Tray(nativeImage.createEmpty())
    } else if (process.platform === 'darwin') {
      // macOS: 使用 16x16 模板图标（系统会自动根据明暗主题调整颜色）
      const trayIcon = icon.resize({ width: 16, height: 16 })
      trayIcon.setTemplateImage(true)
      this.tray = new Tray(trayIcon)
    } else if (process.platform === 'win32') {
      // Windows: 直接使用原始图标，让系统自动选择最佳分辨率
      // .ico 文件内嵌多尺寸，不需要手动 resize
      this.tray = new Tray(icon)
    } else {
      // Linux: 使用适当尺寸的图标
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
