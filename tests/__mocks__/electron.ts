import path from 'path'
import os from 'os'

// vitest 中 mock electron 模块，提供 app.getPath 等最小实现
export const app = {
  getPath(name: string): string {
    const map: Record<string, string> = {
      userData: path.join(os.tmpdir(), 'superconnectx-test-userdata'),
      exe: process.execPath,
      home: os.homedir()
    }
    return map[name] ?? os.tmpdir()
  }
}

// 导出其他可能被引用的 electron 子模块（空对象，按需扩展）
export const BrowserWindow = {}
export const ipcMain = {}
export const dialog = {}
export const shell = {}
