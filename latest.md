# v1.2.10-naihe1

基于上游 `v1.2.10`（`e3b0790`）同步，个人版合并提交：`5cdda39`。
相对上一个人版标签：`v1.2.9-naihe1` → `v1.2.10-naihe1`。

### 个人版保留项

1. **发布与更新源** - 安装包、GitHub Release 和自动更新继续使用 [naiheSH/SuperConnectX](https://github.com/naiheSH/SuperConnectX)
2. **发布安全校验** - 发布前校验标签与 `package.json` 版本一致，并验证 macOS 更新元数据中的版本、SHA-512 和文件大小
3. **多平台发布** - 保留 Windows、Linux、Ubuntu 24 兼容包以及 macOS arm64/x64 双架构产物

### 上游更新

1. **Monorepo 架构升级** - 项目迁移至 pnpm workspace，主应用归位 `apps/superconnectx`，公共能力拆分为 `packages/shared` 和 `packages/foundation`
2. **模板应用** - 新增 `apps/template-app`，作为 workspace 包的实际消费示例
3. **组件模块化** - 继续拆分窗口控制、换肤、连接状态、终端事件与菜单操作等模块
4. **CI 迁移 pnpm** - 使用 `pnpm-lock.yaml` 和 frozen lockfile 实现可复现构建，修复 `cpu-features`、workspace 根依赖写入和幽灵依赖问题

### 个人版打包与 CI 修复

1. **macOS native 清理** - 打包时移除跨平台 serialport prebuild 和 `node_gyp_bins`，并将 universal Mach-O native 模块裁剪为目标架构
2. **Mach-O 校验** - 调用 `lipo` 前先检查文件魔数，避免非 Mach-O 文件导致打包卡顿
3. **GitHub Actions 稳定性** - macOS arm64 迁移至 `macos-15`，Electron 缓存按架构隔离，并显式使用 npmmirror 下载 Electron
4. **Release 产物修复** - 修正 `latest-mac.yml` 的 base64 SHA-512，重复触发时使用 `--clobber` 更新产物，不再删除已有 Release 和标签

### 关键提交

- `5cdda39` 合并上游 `v1.2.10`
- `a0e7a1f` 修复 Electron 镜像环境变量设置
- `76627f2` Electron 下载显式使用 npmmirror
- `099e04f` `lipo` 调用前检查 Mach-O 魔数
- `895b587` 修复 afterPack 测试在 Windows/Intel 上的兼容性
- `f16ae28` 清理 macOS 包内的 x86/跨平台 native 残留
