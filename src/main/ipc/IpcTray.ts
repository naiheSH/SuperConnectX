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
    if (process.platform === 'win32') {
      return join(__dirname, '../../build/icon.ico')
    } else if (process.platform === 'darwin') {
      return join(__dirname, '../../build/icon.icns')
    }
    return join(__dirname, '../../build/icon.png')
  }

  createTray(mainWindow: BrowserWindow): void {
    if (this.tray) {
      return
    }

    const iconPath = this.getIconPath()
    const icon = nativeImage.createFromPath(iconPath)
    
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
