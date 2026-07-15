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

        // Linux: keep physical serial adapters and explicitly supported GPIO/Bluetooth devices.
        if (platform === 'linux') {
          if (path.startsWith('/dev/ttyUSB') || path.startsWith('/dev/ttyACM')) {
            return true
          }
          if (path.startsWith('/dev/ttyS')) {
            return !!(port.manufacturer || port.serialNumber || port.pnpId)
          }
          if (path.startsWith('/dev/ttyAMA') || path.startsWith('/dev/rfcomm')) {
            return true
          }
          return false
        }

        // Windows: ignore ports that are not backed by device metadata. These
        // are commonly software-created COM ports exposed by drivers.
        if (platform === 'win32') {
          return !!(port.manufacturer || port.serialNumber || port.pnpId || port.vendorId || port.productId)
        }

        // macOS: exclude Apple's virtual Bluetooth-incoming port.
        if (platform === 'darwin') {
          return !path.endsWith('.Bluetooth-Incoming-Port')
        }

        return false
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
