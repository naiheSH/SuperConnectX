# SuperConnectX MCP

MCP 跟随主应用发布，不单独建发布仓库或发布流水线。

## 组件

| 组件 | 位置 | 作用 |
| --- | --- | --- |
| MCP 核心 | `packages/superconnectx-mcp` | 工具契约、权限、STDIO/HTTP、模板和写租约 |
| CLI | `packages/superconnectx-mcp-cli` | 不打开桌面端时使用的 `scx-mcp` |
| Skill | `packages/superconnectx-mcp-skill` | AI 调用说明，不含运行时 |
| 桌面接入 | `apps/superconnectx/src/main/mcp` | 复用 GUI 已有连接和日志 |

## 本地验证

```bash
pnpm run test:mcp
pnpm run typecheck:mcp
pnpm run sync:mcp-skill
```

`pnpm test` 会先跑 MCP 包测试，再跑桌面单测。CI 和 Release 使用同一个 `test:mcp` 脚本。

## 交付

- 桌面端：设置 → MCP → 启用服务。安装包带上 `resources/mcp`。
- CLI：不打包、不发 npm。在仓库根目录执行 `bash scripts/install-mcp-cli.sh`，再运行 `scx-mcp --doctor` 和 `scx-mcp --print-config`。
- Skill：按 `packages/superconnectx-mcp-skill/INSTALL.md` 安装，或在桌面端设置页点击安装。

