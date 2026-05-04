# Legacy 命名重构调研报告

> **调研日期**: 2026-05-05
> **目的**: 将 "Legacy" 命名改为更准确的术语

---

## 背景

当前代码中使用 "Legacy" 来描述 Ink/React UI 模式，这是误导性的：
- **Ink UI** 是单机版/完整功能版本，不是"遗留"版本
- **Native REPL** 是服务端/轻量版本

建议命名：
- `Legacy` → `Ink` (技术栈命名)
- 或 `Legacy` → `Standalone` (部署模式命名)

---

## 影响范围分析

### 1. 需要重命名的文件

| 当前文件 | 建议新文件 | 优先级 |
|----------|-----------|--------|
| `ui/legacyAdapter.ts` | `ui/inkAdapter.ts` | 高 |
| `ui/legacyAdapter.test.ts` | `ui/inkAdapter.test.ts` | 高 |
| `runtime/legacyBridgeRenderer.ts` | `runtime/inkBridgeRenderer.ts` | 高 |

### 2. 需要重命名的函数/变量

| 当前命名 | 建议新命名 | 文件位置 |
|----------|-----------|----------|
| `shouldUseLegacyUi()` | `shouldUseInkUi()` | `legacyAdapter.ts` |
| `delegateToLegacyUi()` | `delegateToInkUi()` | `legacyAdapter.ts` |
| `runLegacyUiInProcess()` | `runInkUiInProcess()` | `legacyAdapter.ts` |
| `renderLegacyBridgeRepl()` | `renderInkBridgeRepl()` | `legacyBridgeRenderer.ts` |
| `shouldUseLegacyBridge()` | `shouldUseInkBridge()` | `legacyBridgeRenderer.ts` |
| `useLegacyUi` | `useInkUi` | `index.ts` |
| `LEGACY_TOP_LEVEL_COMMANDS` | `INK_TOP_LEVEL_COMMANDS` | `index.ts` |

### 3. CLI 标志

| 当前标志 | 建议新标志 | 说明 |
|----------|-----------|------|
| `--legacy` | `--ink` | 直接运行 Ink UI |
| `--legacy-bridge` | `--ink-bridge` | 进程内 bridge 模式 |

### 4. 环境变量

| 当前变量 | 建议新变量 | 说明 |
|----------|-----------|------|
| `CCLOCAL_PREFER_LEGACY_BRIDGE` | `CCLOCAL_PREFER_INK_BRIDGE` | next.ts 入口 |

### 5. 用户可见文本

| 文件 | 当前文本 | 建议新文本 |
|------|----------|-----------|
| `index.ts` | `'Run the legacy CLI implementation directly'` | `'Run the Ink terminal UI directly'` |
| `legacyAdapter.ts` | `'try --legacy-bridge for in-process mode'` | `'try --ink-bridge for in-process mode'` |

### 6. 测试文件

| 文件 | 需修改内容 |
|------|-----------|
| `ui/legacyAdapter.test.ts` | 文件重命名 + 测试描述 |
| `index.test.ts` | `'--legacy'` → `'--ink'` |
| `runtime/routeContext.test.ts` | `'--legacy'` → `'--ink'` |

---

## 不需要修改的内容

### 架构桥接类型（保持不变）

这些使用 "Legacy" 描述的是**架构桥接**，不是 UI 模式：

| 类型/接口 | 文件 | 说明 |
|-----------|------|------|
| `LegacyQueryEvent` | `queryEngineAdapter.ts` | 事件格式兼容类型 |
| `LegacyQueryParams` | `queryEngineAdapter.ts` | 查询参数接口 |
| `LegacyMCPClient` | `mcpBridgeAdapter.ts` | MCP 客户端类型 |

### 工具适配器（保持不变）

`toolAdapters.ts` 中的 "legacy tool" 指的是旧版工具实现，不是 UI 模式。

### 无关用途（保持不变）

| 类别 | 示例 | 说明 |
|------|------|------|
| Node.js 调试 | `--debug` 标志 | "legacy Node.js debug flags" |
| 模型迁移 | `migrateLegacyOpusToCurrent.ts` | 模型名称迁移 |
| Keychain | `keychainPrefetch.ts` | 旧版 API key 存储 |

---

## 文档影响

| 文件 | 引用数 | 建议 |
|------|--------|------|
| `CLAUDE.md` | 15 | 更新用户可见示例 |
| `README.md` | 7 | 更新构建输出描述 |
| `docs/planning/*.md` | 100+ | 保持历史记录不变 |

---

## 实施步骤建议

### Phase 1: 文件重命名
1. `git mv ui/legacyAdapter.ts ui/inkAdapter.ts`
2. `git mv ui/legacyAdapter.test.ts ui/inkAdapter.test.ts`
3. `git mv runtime/legacyBridgeRenderer.ts runtime/inkBridgeRenderer.ts`

### Phase 2: 函数/变量重命名
1. 在重命名后的文件中替换所有函数名
2. 更新 `index.ts` 中的引用
3. 更新 `start.ts` 中的引用

### Phase 3: CLI 标志
1. 添加新标志 `--ink`, `--ink-bridge`
2. 保留旧标志作为别名（向后兼容）
3. 更新帮助文本

### Phase 4: 测试更新
1. 重命名测试文件
2. 更新测试描述
3. 更新测试用例中的标志

### Phase 5: 文档更新
1. 更新 CLAUDE.md
2. 更新 README.md

---

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 向后兼容性 | 用户脚本可能使用旧标志 | 保留旧标志作为别名 |
| 导入路径 | 其他项目可能依赖模块路径 | 发布前更新 CHANGELOG |
| 搜索引擎索引 | 文档链接可能失效 | 添加重定向 |

---

## 结论

建议执行此重构，原因：
1. 命名准确性 - "Legacy" 暗示即将废弃，但 Ink UI 是主要版本
2. 用户清晰度 - 新用户不会困惑
3. 维护清晰度 - 开发者更容易理解代码

工作量估计：约 2-3 小时，涉及 10+ 文件修改。
