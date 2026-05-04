# Packages-Native 架构实现计划

> **创建日期**: 2026-05-04
> **状态**: 进行中
> **目标**: 实现支持100+并发任务的packages-native架构，同时保持legacy模式功能完整

---

## 目录

1. [缺陷审计对照表](#缺陷审计对照表)
2. [实现阶段总览](#实现阶段总览)
3. [Phase 1: 基础模块创建](#phase-1-基础模块创建)
4. [Phase 2: 桥接层实现](#phase-2-桥接层实现)
5. [Phase 3: 入口修复](#phase-3-入口修复)
6. [Phase 4: 测试验证](#phase-4-测试验证)
7. [Phase 5: 并发优化](#phase-5-并发优化)
8. [进度检查清单](#进度检查清单)

---

## 缺陷审计对照表

### P0 - 阻塞性问题 (必须先解决)

| 编号 | 问题 | 影响 | 解决方案 | 状态 | 关联阶段 |
|------|------|------|----------|------|----------|
| P0-1 | 3805个TypeScript错误 | 构建可能失败 | 添加缺失类型定义，使用临时类型跳过 | ⬜ 待处理 | Phase 0 |
| P0-2 | 缺少dist目录 | 运行时找不到模块 | 确保构建脚本正确执行 | ⬜ 待处理 | Phase 0 |
| P0-3 | packages/cli模块间循环依赖 | 运行时错误 | 重构导入结构，使用延迟导入 | ⬜ 待处理 | Phase 1 |

### P1 - 重要问题 (应尽快解决)

| 编号 | 问题 | 影响 | 解决方案 | 状态 | 关联阶段 |
|------|------|------|----------|------|----------|
| P1-1 | Tool接口call/execute签名不匹配 | 新工具适配失败 | 统一Tool接口定义 | ⬜ 待处理 | Phase 2 |
| P1-2 | QueryEngine适配器stream gap | 流式输出中断 | 实现正确的AsyncGenerator | ⬜ 待处理 | Phase 2 |
| P1-3 | package.json依赖版本不匹配 | 安装失败 | 更新依赖版本 | ⬜ 待处理 | Phase 0 |

### P2 - 中等问题 (可在实现过程中解决)

| 编号 | 问题 | 影响 | 解决方案 | 状态 | 关联阶段 |
|------|------|------|----------|------|----------|
| P2-1 | index.ts引用不存在的runtime/目录 | 启动失败 | 创建runtime/目录和文件 | ⬜ 待处理 | Phase 1 |
| P2-2 | features参数未在build中启用 | 功能缺失 | 配置build-external.ts | ⬜ 待处理 | Phase 1 |
| P2-3 | 路径计算使用硬编码 | 跨平台兼容性差 | 使用动态路径解析 | ⬜ 待处理 | Phase 3 |

### P3 - 低优先级问题

| 编号 | 问题 | 影响 | 解决方案 | 状态 | 关联阶段 |
|------|------|------|----------|------|----------|
| P3-1 | 测试覆盖率不足 | 回归风险 | 补充单元测试 | ⬜ 待处理 | Phase 4 |
| P3-2 | 文档不完整 | 维护困难 | 补充开发文档 | ⬜ 待处理 | Phase 5 |

---

## 实现阶段总览

```
┌─────────────────────────────────────────────────────────────────┐
│                    Packages-Native 架构                          │
├─────────────────────────────────────────────────────────────────┤
│  Phase 0: 前置准备 (P0/P1问题修复)                               │
│     ↓                                                           │
│  Phase 1: 基础模块创建 (runtime/目录)                           │
│     ↓                                                           │
│  Phase 2: 桥接层实现 (Bridge Adapters)                          │
│     ↓                                                           │
│  Phase 3: 入口修复 (index.ts路由)                                │
│     ↓                                                           │
│  Phase 4: 测试验证 (功能/性能)                                   │
│     ↓                                                           │
│  Phase 5: 并发优化 (100+任务)                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: 前置准备

**目标**: 解决P0/P1阻塞性问题

### 任务清单

#### P0-1: TypeScript错误处理
- [ ] 分析TypeScript错误类型分布
- [ ] 创建临时类型定义文件 `packages/cli/src/types/missing-types.d.ts`
- [ ] 添加模块声明跳过缺失的@ant/*包
- [ ] 验证 `bun run typecheck` 通过

#### P0-2: 构建目录问题
- [ ] 检查 `scripts/build-external.ts` 输出配置
- [ ] 验证dist/目录生成逻辑
- [ ] 测试 `bun run build` 成功执行

#### P1-3: 依赖版本问题
- [ ] 检查package.json依赖版本
- [ ] 更新不兼容的依赖
- [ ] 验证 `bun install` 成功

### 完成标准
- [x] ~~WebSocket配置已修复~~ (已完成)
- [x] ~~React hooks错误已修复~~ (已完成)
- [ ] TypeScript错误降至可接受范围 (<100个)
- [ ] 构建流程完整执行

---

## Phase 1: 基础模块创建

**目标**: 创建runtime/目录及其核心模块

### 需要创建的文件

```
packages/cli/src/runtime/
├── launchOptions.ts      # 启动配置类型定义
├── launchContext.ts      # 运行时上下文管理
├── routeContext.ts       # 路由上下文（命令分发）
├── replRenderer.ts       # REPL渲染器
├── sessionBridge.ts      # 会话桥接器
└── index.ts              # runtime入口导出
```

### 任务清单

#### 1.1 launchOptions.ts
```typescript
// 需要定义的类型
type LaunchMode = 'legacy' | 'packages-native'
type LaunchOptions = {
  mode: LaunchMode
  serverUrl?: string
  sessionId?: string
  resume?: boolean
  // ... 其他配置项
}
```
- [ ] 定义LaunchMode枚举
- [ ] 定义LaunchOptions接口
- [ ] 添加配置验证逻辑

#### 1.2 launchContext.ts
```typescript
// 运行时上下文
class LaunchContext {
  options: LaunchOptions
  client?: CCLocalClient
  session?: SessionHandle
  // ...
}
```
- [ ] 创建LaunchContext类
- [ ] 实现上下文初始化
- [ ] 实现上下文清理

#### 1.3 routeContext.ts
```typescript
// 命令路由
function routeCommand(args: string[]): LaunchOptions
```
- [ ] 分析index.ts现有路由逻辑
- [ ] 提取命令解析逻辑
- [ ] 实现路由分发

#### 1.4 replRenderer.ts
```typescript
// REPL渲染入口
async function renderRepl(context: LaunchContext): Promise<void>
```
- [ ] 复用现有replLauncher.tsx逻辑
- [ ] 添加packages-native模式支持
- [ ] 处理模式切换

### 缺陷关联
| 缺陷 | 本阶段解决方式 |
|------|----------------|
| P2-1 | 创建runtime/目录解决引用问题 |
| P0-3 | 使用延迟导入解决循环依赖 |

### 完成标准
- [ ] 所有runtime/文件创建完成
- [ ] 模块导出正确配置
- [ ] 无循环依赖错误

---

## Phase 2: 桥接层实现

**目标**: 实现legacy工具到新Tool接口的适配

### 需要修改/创建的文件

```
packages/cli/src/bridge/
├── queryEngineAdapter.ts  # QueryEngine适配器 (已存在，需修复)
├── toolAdapters.ts        # 工具适配器 (已存在，需完善)
├── sessionAdapter.ts      # 会话适配器 (新建)
└── streamAdapter.ts       # 流式输出适配器 (新建)
```

### 任务清单

#### 2.1 Tool接口统一
- [ ] 分析现有Tool接口定义
- [ ] 统一call/execute签名
- [ ] 更新所有工具实现

#### 2.2 QueryEngine适配器修复
```typescript
// 问题：stream gap
// 解决方案：正确实现AsyncGenerator
async function* queryAdapter(query: Query): AsyncGenerator<QueryEvent> {
  // 正确的流式输出实现
}
```
- [ ] 分析stream gap具体位置
- [ ] 实现正确的AsyncGenerator
- [ ] 测试流式输出连续性

#### 2.3 会话适配器
```typescript
class SessionAdapter {
  // 将legacy会话概念适配到packages-native
}
```
- [ ] 分析legacy会话结构
- [ ] 实现会话状态映射
- [ ] 处理会话切换

### 缺陷关联
| 缺陷 | 本阶段解决方式 |
|------|----------------|
| P1-1 | 统一Tool接口签名 |
| P1-2 | 修复QueryEngine stream gap |

### 完成标准
- [ ] Tool接口签名统一
- [ ] 流式输出无中断
- [ ] 会话切换正常工作

---

## Phase 3: 入口修复

**目标**: 修复index.ts使其正确路由到两种模式

### 需要修改的文件

```
packages/cli/src/index.ts        # 主入口 (需修复)
packages/cli/src/entrypoints/
├── cli.tsx                      # legacy入口 (已存在)
└── native.ts                    # packages-native入口 (新建)
```

### 任务清单

#### 3.1 index.ts重构
```typescript
// 当前问题：引用不存在的runtime/
// 目标：正确路由到legacy/native模式

import { routeCommand } from './runtime/routeContext.js'

async function main() {
  const options = routeCommand(process.argv.slice(2))
  if (options.mode === 'legacy') {
    // delegate to legacy entry
  } else {
    // packages-native mode
  }
}
```
- [ ] 修复runtime/导入路径
- [ ] 实现双模式路由
- [ ] 添加模式检测逻辑

#### 3.2 native.ts入口
- [ ] 创建packages-native入口文件
- [ ] 初始化CCLocalClient
- [ ] 连接到后端服务

### 缺陷关联
| 缺陷 | 本阶段解决方式 |
|------|----------------|
| P2-1 | 修复index.ts导入路径 |
| P2-3 | 使用动态路径解析 |

### 完成标准
- [ ] `cclocal` 命令启动legacy模式
- [ ] `cclocal --native` 启动packages-native模式
- [ ] 模式切换无错误

---

## Phase 4: 测试验证

**目标**: 验证双模式功能正确性

### 测试用例

#### 4.1 Legacy模式测试
- [ ] 启动CLI: `bun run start`
- [ ] 输入测试: 验证stdin正常
- [ ] 工具调用: 测试常用工具
- [ ] 会话恢复: 测试resume功能

#### 4.2 Packages-Native模式测试
- [ ] 启动后端: `bun run server`
- [ ] 连接测试: 验证WebSocket
- [ ] 并发测试: 10个并发会话
- [ ] 流式输出: 验证SSE流

#### 4.3 集成测试
- [ ] 模式切换测试
- [ ] 会话持久化测试
- [ ] 错误处理测试

### 性能基准
| 指标 | 目标值 | 实际值 | 状态 |
|------|--------|--------|------|
| 启动时间 | <2s | - | ⬜ |
| 并发会话 | 100+ | - | ⬜ |
| 响应延迟 | <100ms | - | ⬜ |
| 内存占用 | <500MB | - | ⬜ |

### 缺陷关联
| 缺陷 | 本阶段解决方式 |
|------|----------------|
| P3-1 | 补充测试用例 |

### 完成标准
- [ ] 所有测试用例通过
- [ ] 性能达标
- [ ] 无内存泄漏

---

## Phase 5: 并发优化

**目标**: 优化以支持100+并发任务

### 优化方向

#### 5.1 后端服务优化
- [ ] 连接池管理
- [ ] 请求队列优化
- [ ] 背压控制

#### 5.2 客户端优化
- [ ] 连接复用
- [ ] 批量请求
- [ ] 缓存策略

#### 5.3 资源管理
- [ ] 内存池化
- [ ] 对象复用
- [ ] GC优化

### 性能测试
- [ ] 100并发会话测试
- [ ] 长时间运行稳定性
- [ ] 峰值负载测试

### 缺陷关联
| 缺陷 | 本阶段解决方式 |
|------|----------------|
| P3-2 | 补充优化文档 |

### 完成标准
- [ ] 支持100+并发会话
- [ ] 资源占用合理
- [ ] 无性能退化

---

## 进度检查清单

### 每日检查项
- [ ] 更新本文档状态
- [ ] 提交代码前运行 `bun run typecheck`
- [ ] 提交代码前运行 `bun run build`
- [ ] 功能变更需更新测试

### 里程碑检查
| 阶段 | 计划完成日期 | 实际完成日期 | 状态 |
|------|-------------|-------------|------|
| Phase 0 | - | - | ⬜ 待开始 |
| Phase 1 | - | - | ⬜ 待开始 |
| Phase 2 | - | - | ⬜ 待开始 |
| Phase 3 | - | - | ⬜ 待开始 |
| Phase 4 | - | - | ⬜ 待开始 |
| Phase 5 | - | - | ⬜ 待开始 |

---

## 附录

### A. 相关文件索引

| 文件 | 用途 | 状态 |
|------|------|------|
| `packages/cli/src/index.ts` | 主入口 | 需修复 |
| `packages/cli/src/replLauncher.tsx` | REPL启动 | 已修复 |
| `packages/cli/src/main.tsx` | legacy主逻辑 | 已修复 |
| `packages/cli/src/client/CCLocalClient.ts` | API客户端 | 完成 |
| `packages/server/src/api/server.ts` | HTTP服务 | 已修复 |
| `packages/server/src/sessions/SessionManager.ts` | 会话管理 | 完成 |
| `scripts/build-external.ts` | 构建脚本 | 已修改 |

### B. 已解决的问题

| 问题 | 解决日期 | 解决方案 |
|------|----------|----------|
| WebSocket配置缺失 | 2026-05-04 | 添加websocket配置到Bun.serve() |
| React hooks错误 | 2026-05-04 | 删除legacy-ui抽象层，直接调用launchRepl |
| 构建入口错误 | 2026-05-04 | 临时禁用next-cli.js构建 |

### C. 参考文档

- `DEVELOPING.md` - 开发指南
- `docs/module-development.md` - 模块开发
- `docs/debugging.md` - 调试指南
- `docs/planning/ARCHITECTURE.md` - 架构设计
