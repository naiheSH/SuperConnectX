import logger from '../ipc/IpcAppLogger'
import ConnectionInfo from './ConnectionInfo'

export default class BaseClient {
  async start(_info: ConnectionInfo, _onData: any, _onClose: any, _onLog?: any): Promise<object> {
    logger.warn('BaseClient.start not implemented - subclass should override')
    return { success: false, message: 'Not implemented' }
  }

  async send(_connId: string, _command: string, _onComplete: any): Promise<object> {
    logger.warn('BaseClient.send not implemented - subclass should override')
    return { success: false, message: 'Not implemented' }
  }

  async disconnect(_connId: string): Promise<object> {
    logger.warn('BaseClient.disconnect not implemented - subclass should override')
    return { success: false, message: 'Not implemented' }
  }

  async updateConfig(_connId: string, _config: any): Promise<object> {
    logger.warn('BaseClient.updateConfig not implemented - subclass should override')
    return { success: false, message: 'Not implemented' }
  }

  setReceiveHex(_connId: string, _receiveHex: boolean): void {
    // 可选实现
  }
}
