# SuperConnectX AI 上下文

本文档用于记录本次排查、修改、打包和发布相关信息，方便其他 AI 工具或下次对话直接读取项目上下文。

## 仓库信息

- 上游仓库：`https://github.com/SuperStudio/SuperConnectX`
- 本次推送仓库：`https://github.com/naiheSH/SuperConnectX`
- 本地路径：`/home/naihe/SuperConnectX`
- 当前分支：`master`
- 本次工作推送 remote：`fork`
- 不要推送到 `origin`，`origin` 指向上游原项目。

## 项目概览

- 这是一个 Electron 桌面应用，前端使用 Vue + TypeScript。
- 项目定位是终端连接工具，继承自 SuperCom。
- 支持串口、Telnet、SSH、FTP 等终端连接能力。
- 主要目录：
  - `src/main`：Electron 主进程代码
  - `src/renderer`：渲染进程和 Vue 页面代码
  - `out/`：构建输出目录
  - `release/`：打包产物目录

## 本地环境记录

- 本地系统：Linux
- 本地 Node 版本：`v24.18.0`
- 本地 npm 版本：`11.18.0`
- 项目 `.npmrc` 里有两个 npm 新版本会提示废弃的配置：
  - `electron_mirror`
  - `electron_builder_binaries_mirror`
- npm 会打印 warning，但不影响测试、构建和打包。

## 已完成的关键修改

### 中文串口编码支持

问题：

- 界面里已有 `GB2312` 和 `GBK` 编码选项。
- 后端原来直接使用 `Buffer.toString(encoding)` 解码串口数据。
- Node.js 原生 `Buffer.toString()` 不支持 `gb2312`、`gbk`、`gb18030`。
- 选择 `GB2312` 后会报错：

```text
TypeError [ERR_UNKNOWN_ENCODING]: Unknown encoding: gb2312
```

修复：

- 新增直接依赖：`iconv-lite`。
- 新增文件：`src/main/protocol/decodeBuffer.ts`。
- 替换接收解码逻辑：
  - `src/main/protocol/BufferLineSplitter.ts`
  - `src/main/protocol/ComClient.ts`
- 替换串口发送编码逻辑：
  - `ComClient.ts` 发送时使用 `encodeBuffer()`，非 Node 原生编码通过 `iconv-lite` 转成 Buffer。

当前行为：

- `utf8`、`ascii`、`hex` 等 Node 原生支持的编码继续走原生 Buffer 逻辑。
- `gb2312`、`gbk`、`gb18030` 等 Node 原生不支持的编码走 `iconv-lite`。
- 本地已验证 `gb2312` 下可以打开 `/dev/ttyUSB0`，不再报 `Unknown encoding: gb2312`。

### Linux 串口日志文件路径修复

问题：

- Linux 串口名通常是 `/dev/ttyUSB0`。
- 项目日志文件名模板会把连接名 `%C` 放进文件名。
- 原逻辑保留了 `/`，导致 `/dev/ttyUSB0` 被当成路径，而不是文件名。
- 例如错误路径：

```text
logs/dev/ttyUSB0-2026-07-06-11h-20m-13s.log
```

- 如果 `logs/dev` 不存在，连接时会失败：

```text
ENOENT: no such file or directory
```

修复：

- 在 `src/main/utils/ProtocolLogger.ts` 中，把日志文件名里的路径分隔符 `/` 和 `\` 替换成 `-`。
- 写日志文件前确保父目录存在。
- 补充/保留了相关单元测试：`tests/unit/ProtocolLogger.test.ts`。

结果：

- `/dev/ttyUSB0` 会变成安全的文件名片段，例如：`-dev-ttyUSB0`。
- 日志路径不会再被误解析成 `logs/dev/...` 子目录。

## 打包后日志目录

默认日志目录基于 Electron 用户数据目录。

Linux：

```text
~/.config/superconnectx/logs
```

Windows：

```text
%APPDATA%\superconnectx\logs
```

通常展开为：

```text
C:\Users\你的用户名\AppData\Roaming\superconnectx\logs
```

macOS：

```text
~/Library/Application Support/superconnectx/logs
```

开发模式下，本地曾出现日志目录：

```text
/home/naihe/SuperConnectX/node_modules/electron/dist/logs
```

日志当前不会自动删除。代码里默认按 20 MB 分片，超过大小会切新日志文件，但旧日志不会自动清理。

## Linux 串口权限处理

本地串口设备：

```text
/dev/ttyUSB0
```

设备所属组：

```text
root dialout
```

本地已执行：

- 将用户 `naihe` 加入 `dialout` 组。
- 创建永久 udev 规则：

```text
/etc/udev/rules.d/99-serial-port-permissions.rules
```

规则内容：

```text
SUBSYSTEM=="tty", KERNEL=="ttyUSB[0-9]*", GROUP="dialout", MODE="0666"
SUBSYSTEM=="tty", KERNEL=="ttyACM[0-9]*", GROUP="dialout", MODE="0666"
```

作用：

- 后续插入 `/dev/ttyUSB*` 或 `/dev/ttyACM*` 设备时自动给可读写权限。
- 避免每次手动执行 `chmod 666 /dev/ttyUSB0`。

## 本地 Linux 打包

本地成功打包命令：

```bash
npx electron-builder --linux --config electron-builder.yml --publish never
```

重要说明：

- 本地打包成功时使用的是 `electron-builder.yml`。
- `electron-builder.yml` 里包含 Linux 的 `maintainer`、`AppImage`、`snap`、`deb` 配置。
- 如果使用 `package.json` 里的 build 配置打 Linux `.deb`，CI 会因为缺少 maintainer 失败。

本地安装过的系统依赖：

```bash
sudo apt-get install -y build-essential python3 make g++ rpm libarchive-tools
```

本地成功产物：

```text
release/superconnectx-1.1.8.AppImage
release/superconnectx_1.1.8_amd64.deb
release/superconnectx_1.1.8_amd64.snap
```

## GitHub Actions

新增 workflow：

```text
.github/workflows/release-windows-linux.yml
```

作用：

- 构建 Windows 和 Linux 安装包。
- 上传构建产物 artifact。
- tag `v*` 触发时，创建 GitHub Release 并上传 Windows/Linux 产物。

关键决策：

- 使用 Node `24`，避免 GitHub Actions 的 Node 20 deprecated warning。
- 不使用 `cache: npm`，因为仓库没有提交可供 setup-node 缓存识别的 lockfile。
- Linux 打包命令：

```bash
npx electron-builder --linux --config electron-builder.yml --publish never
```

- Windows 打包命令：

```bash
npx electron-builder --win --publish never
```

已修复的 CI 问题：

```text
Please specify author 'email' in the application package.json
It is required to set Linux .deb package maintainer.
```

修复方式：Linux CI 改用 `electron-builder.yml`，其中已有：

```yaml
linux:
  maintainer: SuperStudio
```

## 已验证命令

已成功执行过：

```bash
npm run typecheck
npm test
npx electron-vite build
npx electron-builder --linux --config electron-builder.yml --publish never
```

测试结果：

```text
29 个测试文件通过
489 个测试用例通过
```

## macOS 适配备注

- 项目基于 Electron，理论上可以适配 macOS。
- `serialport` 库支持 macOS。
- macOS 串口设备通常类似：

```text
/dev/cu.usbserial-xxxx
/dev/cu.usbmodemxxxx
```

- macOS 上建议优先使用 `/dev/cu.*`，不要优先用 `/dev/tty.*`。
- 本次没有新增 macOS CI 或 macOS Release 流程。
- 如果正式分发 macOS 包，建议处理签名和 notarization，否则用户首次打开体验会差。

## 已推送到 fork 的近期提交

- `87d0cb3` 支持中文串口编码和 Linux 打包
- `e8c37e3` 修复发布 workflow npm 缓存配置
- `21d82cc` 修复 Linux 发布配置
- `eb51b8a` 添加 AI 上下文文档

## 常用命令

启动开发模式：

```bash
npm run dev
```

类型检查：

```bash
npm run typecheck
```

单元测试：

```bash
npm test
```

Linux 打包：

```bash
npx electron-vite build
npx electron-builder --linux --config electron-builder.yml --publish never
```

只推送到 fork：

```bash
git push fork master
```
