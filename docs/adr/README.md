# 架构决策记录 (ADR)

本目录包含 Claude Code Rebuilt 项目的架构决策记录。

## 什么是 ADR？

架构决策记录 (Architecture Decision Record, ADR) 是一种记录重要架构决策的文档，包括：
- 决策的上下文和背景
- 做出的决策
- 决策的后果（正面和负面）
- 考虑过的备选方案

## ADR 列表

| 序号 | 标题 | 状态 | 日期 |
|------|------|------|------|
| 0001 | [使用 Bun 运行时](./0001-use-bun-runtime.md) | 已接受 | 2026-03-31 |
| 0002 | [React Compiler Runtime Shim 策略](./0002-react-compiler-runtime-shim.md) | 已接受 | 2026-03-31 |
| 0003 | [Feature Flag 策略](./0003-feature-flag-strategy.md) | 已接受 | 2026-03-31 |
| 0004 | [类型错误处理策略](./0004-type-error-handling-strategy.md) | 已接受 | 2026-03-31 |
| 0005 | [内部包 Shim 策略](./0005-internal-package-shim-strategy.md) | 已接受 | 2026-03-31 |

## 如何创建新 ADR

1. 复制模板（如果有）或参考现有 ADR
2. 使用 `000x-description.md` 格式命名
3. 更新此 README 中的列表
4. 提交到 git

## 更多信息

- [ADR GitHub 组织](https://github.com/adr)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
