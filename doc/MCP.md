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

完整步骤见 `doc/MCP-DELIVERY.md`。仓库内执行 `bash scripts/install-mcp.sh`，再用 `bash scripts/verify-mcp.sh` 验收。
