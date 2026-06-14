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
      include: ['src/main/utils/SafeStorageString.ts'],
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
      electron: resolve('tests/__mocks__/electron.ts')
    }
  }
})
