import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // 测试文件目录
    include: ['tests/**/*.test.ts'],
    // 运行环境：Node
    environment: 'node',
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'tests/coverage',
      // 第一梯队目标文件
      include: [
        'src/main/utils/DataCheckEngine.ts',
        'src/main/utils/SafeStorageString.ts',
        'src/main/utils/BackupManager.ts',
        'src/main/utils/PrintAppInfo.ts',
        'src/main/protocol/BufferLineSplitter.ts',
        'src/main/storage/BaseStorage.ts',
        'src/main/storage/ConnectionStorage.ts',
        'src/main/storage/CommandHistoryStorage.ts',
        'src/main/storage/ShortcutsStorage.ts',
        'src/main/storage/CommandGroupStorage.ts',
        'src/main/storage/PreSetCommandStorage.ts',
        'src/main/storage/SettingsStorage.ts',
        'src/main/storage/AppSettingsStorage.ts',
        'src/main/storage/ComSettingsStorage.ts',
        'src/renderer/src/utils/EventBus.ts',
        'src/renderer/src/utils/FileUtils.ts',
        'src/renderer/src/utils/AnsiParser.ts',
        'src/renderer/src/utils/FormUtils.ts',
        'src/renderer/src/utils/FontDetector.ts',
        'src/renderer/src/entity/protocol/telnet.ts',
        'src/renderer/src/entity/protocol/ftp.ts',
        'src/renderer/src/entity/protocol/com.ts',
        'src/renderer/src/entity/protocol/http.ts',
        'src/renderer/src/entity/protocol/ssh.ts',
        'src/renderer/src/entity/protocol/tcp.ts',
        'src/renderer/src/entity/protocol/udp.ts',
        'src/renderer/src/entity/protocol/ping.ts',
        'src/renderer/src/entity/protocol/tftp.ts',
        'src/renderer/src/entity/protocol/base.ts',
        'src/renderer/src/entity/protocol/index.ts',
        'src/renderer/src/entity/protocol/TelnetInfo.ts',
        'src/main/utils/ProtocolLogger.ts'
      ],
      exclude: [
        'out/**',
        'node_modules/**',
        'tests/**',
        '**/*.test.ts',
        '**/__mocks__/**'
      ]
    },
    // 测试报告（json 用于 CI，junit 用于 Jenkins 等）
    reporters: ['default', 'json', 'junit'],
    outputFile: {
      json: 'tests/report/results.json',
      junit: 'tests/report/junit.xml'
    }
  },
  resolve: {
    alias: {
      '@': resolve('src'),
      // 用 mock 替代 electron 模块
      electron: resolve('tests/__mocks__/electron.ts'),
      // 用 mock 替代 electron-store 模块
      'electron-store': resolve('tests/__mocks__/electron-store.ts'),
      // 用 mock 替代 logger (避免 import 链导致 fs 等问题)
      '../ipc/IpcAppLogger': resolve('tests/__mocks__/IpcAppLogger.ts')
    }
  }
})
