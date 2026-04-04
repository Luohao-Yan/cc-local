# 实现计划：Buddy Completion

## 概述

将 buddy 终端宠物伴侣系统的三个缺失模块补全：`/buddy` 命令实现、companion 观察者、Feature Flag 启用。所有实现基于已有的渲染层和数据层，使用 TypeScript/TSX，遵循项目现有的命令模式和 API 调用模式。

## 任务

- [x] 1. 启用 BUDDY Feature Flag
  - 在 `scripts/build-external.ts` 中将 `"BUDDY"` 从 `EXTERNAL_DISABLED_FEATURES` 数组移除
  - 在 `scripts/build-external.ts` 中将 `"BUDDY"` 添加到 `ENABLED_FEATURES` 数组
  - 变更后 `feature('BUDDY')` 在运行时返回 `true`
  - _需求: 5.1, 5.2, 5.3_

- [x] 2. 实现 /buddy 命令模块
  - [x] 2.1 创建命令注册文件 `src/commands/buddy/index.ts`
    - 导出符合 `Command` 接口的默认对象，类型为 `local-jsx`，名称为 `buddy`
    - 设置 `argumentHint: '[pet|card|mute|unmute|off]'`
    - 通过 `load: () => import('./buddy.js')` 懒加载实现文件
    - _需求: 1.1_

  - [x] 2.2 创建命令实现文件 `src/commands/buddy/buddy.tsx` — 子命令路由与辅助函数
    - 导出 `call` 函数，签名符合 `LocalJSXCommandCall`
    - 实现子命令路由：无参数时根据 companion 是否存在分别执行孵化或显示卡片；`pet` 设置 `AppState.companionPetAt`；`card` 渲染属性卡片；`mute`/`unmute` 设置 `GlobalConfig.companionMuted`；`off` 清除 `GlobalConfig.companion`；未识别子命令返回帮助信息
    - 实现属性条渲染辅助函数 `renderStatBar(value: number, width: number): string`，填充字符数与数值成正比，填充 + 空白 = 总宽度
    - _需求: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 2.3 编写属性测试：未识别子命令一律返回帮助
    - **属性 1：未识别子命令一律返回帮助**
    - 使用 `fast-check` 生成不属于 `{pet, card, mute, unmute, off}` 的随机字符串
    - 验证路由函数返回帮助结果而非执行副作用
    - **验证: 需求 1.8**

  - [x] 2.4 编写属性测试：属性条渲染与数值成正比
    - **属性 2：属性条渲染与数值成正比**
    - 使用 `fast-check` 生成 1-100 的随机整数
    - 验证填充字符数 = `Math.round(value / 100 * totalWidth)`，且填充 + 空白 = totalWidth
    - **验证: 需求 3.2**

- [x] 3. 实现属性卡片与孵化流程
  - [x] 3.1 在 `buddy.tsx` 中实现 `<CompanionCard />` 组件
    - 渲染 ASCII 精灵（`renderSprite(bones)`）
    - 渲染名称 + 物种信息
    - 渲染稀有度星级（`RARITY_STARS`）和颜色（`RARITY_COLORS`）
    - 渲染五维属性条（DEBUGGING、PATIENCE、CHAOS、WISDOM、SNARK）
    - 渲染性格描述（personality）
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 在 `buddy.tsx` 中实现 `<HatchFlow />` 组件
    - 调用 `roll(companionUserId())` 获取 bones
    - 调用 `queryHaiku` 生成 soul（name + personality），传入 species、rarity、stats 作为上下文
    - 渲染孵化动画（加载指示器）
    - 成功后将 `{ name, personality, hatchedAt: Date.now() }` 存入 `GlobalConfig.companion` 并持久化
    - 完成后显示 `<CompanionCard />`
    - AI 调用失败时显示错误信息并调用 `onDone`
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.3 编写单元测试：属性卡片和命令路由
    - 测试 `renderStatBar` 的边界值（1、50、100）
    - 测试 mute/unmute/off 的 config 操作逻辑
    - 测试无 companion 时 pet/card/mute/unmute 的提示行为
    - _需求: 1.3, 1.4, 1.5, 1.6, 1.7, 3.2_

- [x] 4. 检查点 — 确保命令模块完整
  - 确保所有测试通过，如有问题请询问用户。

- [x] 5. 实现 Companion 观察者
  - [x] 5.1 创建 `src/buddy/observer.ts`
    - 导出 `fireCompanionObserver(messages: Message[], onReaction: (reaction: string) => void): Promise<void>`
    - 检查 `getCompanion()` 是否存在且 `getGlobalConfig().companionMuted` 不为 true，不满足则直接 return
    - 提取最近对话消息的文本摘要
    - 构造 prompt 包含 companion 的 personality 和 stats，调用 `queryHaiku` 生成 ≤60 字符的反应文字
    - 成功时调用 `onReaction(reaction)`
    - 整个函数用 try-catch 包裹，异常静默忽略
    - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.2 编写属性测试：Observer 守卫条件正确性
    - **属性 3：Observer 守卫条件正确性**
    - 使用 `fast-check` 生成随机的 companion 存在/不存在和 muted 状态组合
    - 使用 mock 的 `getCompanion` 和 `getGlobalConfig`
    - 验证仅在 companion 存在且未静音时才调用 AI（mock `queryHaiku`）和 `onReaction`
    - **验证: 需求 4.2**

  - [x] 5.3 编写单元测试：Observer 错误处理
    - 测试 `queryHaiku` 抛出异常时不调用 `onReaction` 且不抛出错误
    - 测试正常情况下 `onReaction` 被调用且传入反应文字
    - _需求: 4.4, 4.5_

- [x] 6. REPL 集成
  - [x] 6.1 在 `src/screens/REPL.tsx` 中添加 `fireCompanionObserver` 的导入
    - 添加 `import { fireCompanionObserver } from '../buddy/observer.js'`
    - 确认已有的 `void fireCompanionObserver(...)` 调用点正确连接
    - _需求: 6.1, 6.2_

- [x] 7. 最终检查点 — 确保所有模块集成完整
  - 确保所有测试通过，如有问题请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 交付
- 每个任务引用了具体的需求编号以确保可追溯性
- 检查点任务用于增量验证
- 属性测试验证设计文档中定义的正确性属性
- 单元测试验证具体示例和边界情况
