### 新增功能

1. **Linux 串口权限一键修复** - AppImage 等无安装钩子的包格式下，串口因权限不足（EACCES）打开失败时，弹出「修复权限」引导对话框，点击后通过 pkexec 请求管理员授权，自动写入串口 udev 访问规则并立即生效；用户取消授权或系统缺少 pkexec 时给出明确提示与手动解决方案。

### 优化修复

1. **deb udev 规则完善** - 串口访问规则从仅覆盖 ttyUSB/ttyACM 扩展到串口选择器支持的全部设备族（ttyUSB/ttyACM/ttyAMA/rfcomm/ttyS），并拆分为独立规则行，兼容不支持 alternation 语法的旧版 udev。
2. **deb 卸载清理** - 新增卸载后脚本，deb 包卸载时自动删除已写入的 udev 规则并重载，不残留系统文件。
3. **snap 串口支持** - snap 包声明 serial-port plug，支持访问 USB 串口设备（该接口非自动连接，安装后需执行 `sudo snap connect superconnectx:serial-port`）。
4. **串口错误码透传** - 打开串口失败时向渲染进程透传错误码（如 EACCES），为权限修复入口提供结构化判断依据。
