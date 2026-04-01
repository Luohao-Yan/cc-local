# 3. Feature Flag 策略

| 状态 | 日期 |
|------|------|
| 已接受 | 2026-03-31 |

## 上下文

原始代码包含 91 个功能标志，用于控制内部 Anthropic 功能：
- 内部服务集成 (`BRIDGE`, `DAEMON`, `COORDINATOR`)
- 付费功能 (`VOICE_MODE`, `COMPUTER_USE`)
- 实验性功能 (`KAIROS_ASSISTANT`)
- 企业功能 (`SAML_AUTH`, `TEAM_WORKSPACES`)

这些功能依赖内部 API、私有包和基础设施，无法在公开版本中使用。

## 决策

**禁用绝大多数功能标志，仅启用最少必要的安全功能：**

| 状态 | 数量 | 功能 |
|------|------|------|
| 启用 | 3 | `AUTO_THEME`, `BREAK_CACHE_COMMAND`, `BUILTIN_EXPLORE_PLAN_AGENTS` |
| 禁用 | 88 | 所有其他功能 |

### 实现方式
在 `scripts/build-external.ts` 中：
```typescript
const ENABLED_FEATURES = new Set([
  'AUTO_THEME',
  'BREAK_CACHE_COMMAND',
  'BUILTIN_EXPLORE_PLAN_AGENTS',
]);

const EXTERNAL_DISABLED_FEATURES = ALL_FEATURES.filter(
  f => !ENABLED_FEATURES.has(f)
);
```

## 后果

### 正面
- 避免访问内部 API 和服务
- 防止意外泄露内部功能
- 减少构建体积（死代码消除）
- 避免对缺失内部包的依赖

### 负面
- 某些代码路径永远不会执行
- 部分 UI 组件可能被隐藏
- 无法使用原始 Claude Code 的完整功能

## 禁用的功能类别

| 类别 | 示例 |
|------|------|
| 内部服务 | `BRIDGE`, `DAEMON`, `COORDINATOR` |
| 语音/计算机控制 | `VOICE_MODE`, `COMPUTER_USE` |
| AI 助手 | `KAIROS_ASSISTANT`, `CLAUDE_DESKTOP` |
| 企业功能 | `SAML_AUTH`, `TEAM_WORKSPACES` |
| 云同步 | `CLOUD_SYNC`, `REMOTE_SESSIONS` |

## 备选方案

考虑过但拒绝的方案：
1. **启用所有功能** - 会导致运行时错误，因为依赖缺失
2. **逐个评估** - 耗时且大多数功能仍依赖内部基础设施
3. **删除禁用代码** - 会破坏原始代码结构，难以与上游同步

## 相关决策
- [0001 - 使用 Bun 运行时](./0001-use-bun-runtime.md)
- [0005 - 内部包 Shim 策略](./0005-internal-package-shim-strategy.md)
