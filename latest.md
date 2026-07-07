### 新增功能

1. **中文串口编码支持** - 新增 `GB2312`、`GBK`、`GB18030` 等中文编码的串口接收和发送支持。
2. **Windows + Linux 双平台发布** - 新增 GitHub Actions workflow，可构建 Windows 和 Linux 安装包。
3. **手动构建自动生成 Release** - 手动运行 workflow 时会创建 `manual-*` 预发布版本，并上传可直接下载的 Release 资产。
4. **Linux 安装包支持** - Linux 构建支持 `.AppImage`、`.deb`、`.snap`。
5. **AI 上下文文档** - 新增 `AI_CONTEXT.md`，记录项目背景、构建方式、常见问题和本次修改内容。

### 日志优化

1. **日志逐行时间戳** - 接收数据显示和日志文件中，多行内容会为每一行补充时间戳。
2. **另存为导出完整日志** - 日志另存为时会合并当前连接生命周期内的所有分片，不再只保存当前分片。
3. **固定分片文件名基名** - 同一次连接的分片文件使用同一个基名，仅追加 `-1`、`-2`、`-3` 等序号。
4. **另存为默认文件名优化** - 另存为默认文件名调整为 `端口-YYYY-MM-DD-HHh-MMm-SSs.log` 格式。
5. **Linux 串口日志路径修复** - 修复 `/dev/ttyUSB0` 等串口名被误解析为路径导致日志创建失败的问题。
6. **日志父目录自动创建** - 写入日志前自动创建父目录，避免目录不存在导致写入失败。

### 打包与发布修复

1. **Release 资产直接可用** - Release 上传 `.exe`、`.AppImage`、`.deb`、`.snap` 等直接安装/运行文件，不再额外上传 Windows 解压包。
2. **修复 Linux deb maintainer 问题** - Linux CI 打包改用 `electron-builder.yml`，解决 `.deb` 打包缺少 maintainer 导致失败的问题。
3. **修复 npm cache workflow 问题** - 移除 `setup-node` 的 npm cache 配置，避免无 lockfile 时 CI 失败。
4. **升级 CI Node 版本** - workflow 使用 Node 24，避免 GitHub Actions Node 20 deprecated warning。
5. **修复 Ubuntu 托盘图标资源** - 将 `icon.png` 加入打包资源，避免 Ubuntu 状态栏托盘图标显示异常。

### 提交记录

- `c26f73e` 手动构建上传 Release 资产
- `9ccb961` 发布产物改为直接安装包
- `3f2ed3b` 接收数据显示逐行时间戳
- `94ab1c8` 调整日志另存为默认文件名
- `c5c3912` 固定日志分片文件名基名
- `0957e59` 另存为导出完整分片日志
- `12e18df` 修复托盘图标资源和日志逐行时间戳
- `a79a16f` 修复 Linux 日志另存为默认文件名
- `0fe3b57` 中文化 AI 上下文文档
- `eb51b8a` 添加 AI 上下文文档
- `21d82cc` 修复 Linux 发布配置
- `e8c37e3` 修复发布 workflow npm 缓存配置
- `87d0cb3` 支持中文串口编码和 Linux 打包
