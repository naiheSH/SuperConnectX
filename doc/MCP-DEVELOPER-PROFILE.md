# 开发者包

开发者包是一份 JSON 配置。它把设备模板、模板目录和自定义 Facade 组合成自己的设备能力。

用户不用手写配置。运行一次：

```bash
scx-mcp --init
```

然后只往目录里丢文件，不用改 JSON：

- `templates/*.json`：设备模板
- `resources/`：寄存器表、协议说明、标定数据
- `scripts/`：辅助脚本
- `parsers/*.mjs`：解析器，文件名就是工具名
- `tools/*.mjs`：自定义工具，文件名就是工具名

`--doctor` 会显示加载了哪个 profile、模板数量和跳过原因。

## 构件
| type | 作用 | path |
| --- | --- | --- |
| `template-dir` | 设备命令和日志事件模板 | 目录 |
| `resource-dir` | 寄存器表、协议说明、标定数据等资料 | 目录 |
| `script-dir` | 开发者自己的辅助脚本 | 目录 |
| `parser` | `parsers/*.mjs`，每个文件自动成为一个工具 | 目录或单个模块 |
| `tool` | `tools/*.mjs`，每个文件自动成为一个工具 | 目录或单个模块 |
| `facade` | 替换默认连接后端 | 模块文件，导出 `McpFacade` |
自定义 Facade 必须导出 `default` 或 `facade`，并实现 `McpFacade`。

模板只声明命令、等待条件和日志事件，不执行 Shell、JavaScript 或网络请求。写命令仍受 MCP 写租约和权限模式约束。
