import { ipcMain } from 'electron'
import { SerialPort } from 'serialport'
import logger from './IpcAppLogger'

export default class IpcSerialPort {
  private static sInstance: IpcSerialPort

  constructor() {}

  static getInstance(): IpcSerialPort {
    if (IpcSerialPort.sInstance == null) {
      IpcSerialPort.sInstance = new IpcSerialPort()
    }
    return IpcSerialPort.sInstance
  }

  async listSerialPorts(): Promise<object[]> {
    try {
      const ports = await SerialPort.list()
      logger.info(`found ${ports.length} serial ports`)

      const platform = process.platform

      const filtered = ports.filter((port) => {
        const path = port.path || ''

        // Linux: 过滤掉系统虚拟串口，只保留真实设备
        if (platform === 'linux') {
          // 保留 USB 转串口设备
          if (path.startsWith('/dev/ttyUSB') || path.startsWith('/dev/ttyACM')) {
            return true
          }
          // ttyS 端口：只有有 manufacturer 或 serialNumber 的才保留
          if (path.startsWith('/dev/ttyS')) {
            return !!(port.manufacturer || port.serialNumber || port.pnpId)
          }
          // ttyAMA (树莓派GPIO)、rfcomm (蓝牙) 保留
          if (path.startsWith('/dev/ttyAMA') || path.startsWith('/dev/rfcomm')) {
            return true
          }
          // 其他 /dev/tty* 设备保留（排除 ttyprintk）
          if (path.startsWith('/dev/tty') && !path.startsWith('/dev/ttyprintk')) {
            return true
          }
          // /dev/cu.* 保留
          if (path.startsWith('/dev/cu.')) {
            return true
          }
          return false
        }

        // Windows / macOS: 保留所有
        return true
      })

      logger.info(`filtered to ${filtered.length} serial ports`)
      return filtered.map((port) => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        pnpId: port.pnpId,
        locationId: port.locationId,
        vendorId: port.vendorId,
        productId: port.productId
      }))
    } catch (error) {
      logger.error(`list serial ports failed: ${error}`)
      return []
    }
  }

  init(_logger: any, _windows: any): void {
    ipcMain.handle('list-serial-ports', async () => {
      return await this.listSerialPorts()
    })

    logger.info(`init IpcSerialPort done`)
  }
}
