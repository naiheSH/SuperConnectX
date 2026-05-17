import { ipcMain, app } from 'electron'
import logger from './IpcAppLogger'
import SettingsStorage from '../storage/SettingsStorage'
import IpcTray from './IpcTray'

export default class IpcWindow {
  private static sInstance: IpcWindow
  private settingsStorage: SettingsStorage

  constructor() {
    this.settingsStorage = new SettingsStorage()
  }

  static getInstance(): IpcWindow {
    if (IpcWindow.sInstance == null) {
      IpcWindow.sInstance = new IpcWindow()
    }

    return IpcWindow.sInstance
  }

  init(windows): void {
    // 窗口控制IPC
    ipcMain.handle('minimize-window', () => windows.mainWindow?.minimize())
    ipcMain.handle('close-window', () => {
      const settings = this.settingsStorage.getSettings()
      if (settings.minimizeToTray) {
        // 隐藏到托盘而不是关闭
        if (windows.mainWindow) {
          IpcTray.getInstance().hideToTray(windows.mainWindow)
        }
      } else {
        windows.mainWindow?.close()
      }
    })
    ipcMain.handle('get-window-state', () => windows.mainWindow?.isMaximized())
    ipcMain.handle('maximize-window', () =>
      windows.mainWindow?.isMaximized()
        ? windows.mainWindow?.unmaximize()
        : windows.mainWindow?.maximize()
    )
    ipcMain.handle('get-app-version', () => app.getVersion())

    logger.info(`init IpcWindow done`)
  }
}
