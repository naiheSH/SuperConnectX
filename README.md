

[中文](README.md) [English](README_EN.md) [日本語](README_JP.md)


<h1 align="center">SuperConnectX</h1>

[![LICENSE](https://img.shields.io/badge/license-GPL%203.0-blue)](#)
[![Star](https://img.shields.io/github/stars/SuperStudio/SuperConnectX?label=Star%20this%20repo)](https://github.com/SuperStudio/SuperConnectX)
[![Fork](https://img.shields.io/github/forks/SuperStudio/SuperConnectX?label=Fork%20this%20repo)](https://github.com/SuperStudio/SuperConnectX/fork)


SuperConnectX 是**超级终端工具**，支持 com、telnet 等终端连接，完全**使用 vibe coding 开发**

下载地址：[点此下载](https://github.com/SuperStudio/SuperConnectX/releases)


![image-20260531221403478](Image/image-20260531221403478.png)


![star-history](https://api.star-history.com/svg?repos=SuperStudio/SuperConnectX&type=Date)

# 功能创新

1、串口等功能完全继承自 [SuperCom](https://github.com/SuperStudio/SuperCom)

2、支持 telnet 功能

# 软件特性

## 语法高亮

<img src="Image/image-20260712223054054.png" alt="image-20260712223054054" style="zoom:80%;" />

<img src="Image/image-20260712223112569.png" alt="image-20260712223112569" style="zoom:80%;" />

## 分屏

<img src="Image/image-20260712223133963.png" alt="image-20260712223133963" style="zoom:80%;" />

支持选项卡拖拽

<img src="Image/image-20260712223431638.png" alt="image-20260712223431638" style="zoom:80%;" />

## 命令编辑

<img src="Image/image-20260712223209692.png" alt="image-20260712223209692" style="zoom:80%;" />

## 串口CRC校验

<img src="Image/image-20260712223233500.png" alt="image-20260712223233500" style="zoom:80%;" />

## 主题-深浅模式

<img src="Image/image-20260712212608912.png" alt="image-20260712212608912" style="zoom:80%;" />

<img src="Image/image-20260712212627051.png" alt="image-20260712212627051" style="zoom:80%;" />

## 支持多种连接

com/telnet/ftp

<img src="Image/image-20260712212729695.png" alt="image-20260712212729695" style="zoom:80%;" />

<img src="Image/image-20260712222905898.png" alt="image-20260712222905898" style="zoom:80%;" />

<img src="Image/image-20260712222929409.png" alt="image-20260712222929409" style="zoom:80%;" />

## 快捷键

<img src="Image/image-20260712222946297.png" alt="image-20260712222946297" style="zoom:80%;" />

## 导入导出数据

<img src="Image/image-20260712223001191.png" alt="image-20260712223001191" style="zoom:80%;" />

## 字体、换行等

<img src="Image/image-20260712223024396.png" alt="image-20260712223024396" style="zoom:80%;" />



## 自动更新

<img src="Image/image-20260712223343355.png" alt="image-20260712223343355" style="zoom:80%;" />

# 如何开发？

## 环境配置

安装依赖

```bash
npm install
```

运行

```bash
npm run dev
```

## 参与开发

vscode 中下载插件 codebuddy，或者使用其他 agent 进行 vibe coding 即可

<img src="Image/image-20260531221642675.png" alt="image-20260531221642675" style="zoom: 80%;" />

# 版本发布

## 自动生成 releaseNotes

将 skills\version-generate.md 中的文本粘贴到 vibe coding 对话框里即可

## codecheck检查

运行 `npm run typecheck`

## 本地构建

运行 `build.bat` 即可

## 流水线构建

运行 `release.bat` 即可，github actions会自动启动，构建完成后自动生成最新 releases

<img src="Image/image-20260531222201852.png" alt="image-20260531222201852" style="zoom:80%;" />

# Fork 更新日志

基于上游 SuperStudio/SuperConnectX，共 37 项提交。

## 功能
- 支持中文串口编码和 Linux 打包
- 接收数据显示逐行时间戳
- 另存为导出完整分片日志
- 添加 AI 上下文文档并中文化
- 添加 Windows zip 发布产物
- 添加 Ubuntu 24 兼容构建（Electron 35 + 38）
- 添加 macOS 双架构构建 (arm64 + x64)
- 支持 naihe 标签发布
- 发布流程自动生成变更日志
- 添加 afterPack 钩子自动修复 chrome-sandbox 权限
- 版本号添加 -naihe 后缀，通知自动关闭

## 修复
- 修复发布 workflow npm 缓存配置
- 修复 Linux 发布配置
- 修复 Linux 日志另存为默认文件名
- 修复托盘图标资源
- 固定日志分片文件名基名
- 调整日志另存为默认文件名
- 发布产物改为直接安装包
- 修复自定义标签发行版命名
- 修复 Ubuntu 24 构建产物文件名冲突
- 修复 AppDir 测试用例跨平台兼容性
- 修复 TypeScript 类型错误
- 重新应用 Linux 串口过滤（上游合并后丢失）
- 修复 CI 测试失败
- macOS 构建 Python setuptools 安装方式
- macOS pip externally-managed-environment 修复
- 区分 macOS 和其他平台的 Python setuptools 安装方式
- 修复 log rotation 数据丢失、时间戳正则
- 串口过滤策略改为保守模式

## CI
- 添加跨平台构建工作流
- macOS Intel 构建 runner 修复
- 发布 macOS 双架构独立包
- 更新发布资产和串口过滤

## 测试
- 串口测试改为平台专属 fixture
- 修复 Windows 串口测试期望值
