# 需求文档

## 简介

本功能补全项目中 buddy（终端宠物伴侣系统）缺失的三个模块：`/buddy` 命令实现、companion 观察者（observer）、以及 BUDDY feature flag 启用。渲染层（CompanionSprite、sprites）和数据层（types、companion、prompt）已完整实现，本需求聚焦于将这些已有模块串联起来，使 buddy 功能端到端可用。

## 术语表

- **Companion**: 终端宠物伴侣实体，由 bones（确定性外观属性）和 soul（AI 生成的名字与性格）组成
- **Bones**: 从 `hash(userId)` 确定性派生的外观属性（species、rarity、eye、hat、stats 等），不持久化
- **Soul**: AI 生成的 name 和 personality，持久化存储在 `~/.claude.json` 的 `companion` 字段中（StoredCompanion 类型）
- **CompanionSprite**: 已实现的 React 组件，负责渲染 ASCII 精灵动画、语音气泡和爱心动画
- **SpeechBubble**: CompanionSprite 内的语音气泡子组件，读取 `AppState.companionReaction` 渲染文字
- **Observer**: 在每次 AI 回复结束后触发的观察者函数，让 AI 根据 companion 性格生成一句反应文字
- **AppState**: 全局应用状态存储，包含 `companionReaction` 和 `companionPetAt` 字段
- **GlobalConfig**: 持久化配置（`~/.claude.json`），包含 `companion?: StoredCompanion` 和 `companionMuted?: boolean` 字段
- **Feature_Flag**: 构建时特性开关，通过 `feature('BUDDY')` 在运行时检查是否启用
- **REPL**: 主交互循环界面，已集成 CompanionSprite 渲染和 fireCompanionObserver 调用点
- **Command**: 项目命令系统的统一接口类型，buddy 命令为 `local-jsx` 类型

## 需求

### 需求 1：/buddy 命令注册与路由

**用户故事：** 作为开发者，我希望通过 `/buddy` 命令及其子命令与终端宠物伴侣交互，以便管理和互动我的 companion。

#### 验收标准

1. THE Command_Module SHALL 导出一个符合 `Command` 接口的默认对象，类型为 `local-jsx`，名称为 `buddy`
2. WHEN 用户输入 `/buddy` 且无子命令参数时，THE Command_Module SHALL 根据 companion 是否已存在分别执行孵化流程或显示 companion 面板
3. WHEN 用户输入 `/buddy pet` 时，THE Command_Module SHALL 将 `AppState.companionPetAt` 设置为当前时间戳（`Date.now()`），触发 CompanionSprite 的 2.5 秒爱心动画
4. WHEN 用户输入 `/buddy card` 时，THE Command_Module SHALL 渲染完整属性卡片，包含 ASCII 精灵、五维属性条、性格描述和稀有度星级
5. WHEN 用户输入 `/buddy mute` 时，THE Command_Module SHALL 将 `GlobalConfig.companionMuted` 设置为 `true` 并持久化保存
6. WHEN 用户输入 `/buddy unmute` 时，THE Command_Module SHALL 将 `GlobalConfig.companionMuted` 设置为 `false` 并持久化保存
7. WHEN 用户输入 `/buddy off` 时，THE Command_Module SHALL 清除 `GlobalConfig.companion` 字段并持久化保存，完全隐藏 companion
8. IF 用户输入未识别的子命令，THEN THE Command_Module SHALL 返回帮助信息，列出所有可用子命令

### 需求 2：首次孵化流程

**用户故事：** 作为首次使用 `/buddy` 的开发者，我希望看到一个孵化动画并获得一个独特的 companion，以便拥有个性化的终端宠物体验。

#### 验收标准

1. WHEN 用户首次执行 `/buddy` 且 `GlobalConfig.companion` 为 undefined 时，THE Hatch_Flow SHALL 调用 `roll(companionUserId())` 生成 bones
2. WHEN 孵化流程启动时，THE Hatch_Flow SHALL 调用 AI 生成 companion 的 name 和 personality（soul），传入 bones 中的 species、rarity 和 stats 作为上下文
3. WHEN AI 成功返回 soul 数据时，THE Hatch_Flow SHALL 将 `{ name, personality, hatchedAt: Date.now() }` 作为 StoredCompanion 存入 `GlobalConfig.companion` 并持久化
4. WHILE 孵化流程进行中，THE Hatch_Flow SHALL 渲染孵化动画（如蛋裂开的 ASCII 动画或加载指示器）
5. WHEN 孵化完成时，THE Hatch_Flow SHALL 显示新 companion 的完整属性卡片
6. IF AI 调用失败，THEN THE Hatch_Flow SHALL 显示错误信息并提示用户重试

### 需求 3：属性卡片渲染

**用户故事：** 作为开发者，我希望查看 companion 的完整属性卡片，以便了解它的各项属性和稀有度。

#### 验收标准

1. THE Card_Renderer SHALL 渲染 companion 的 ASCII 精灵（使用 `renderSprite` 函数）
2. THE Card_Renderer SHALL 渲染五维属性条（DEBUGGING、PATIENCE、CHAOS、WISDOM、SNARK），每个属性以可视化进度条形式展示，数值范围 1-100
3. THE Card_Renderer SHALL 渲染 companion 的性格描述（personality 字段）
4. THE Card_Renderer SHALL 渲染稀有度星级（使用 `RARITY_STARS` 常量）和稀有度名称，并使用对应的 `RARITY_COLORS` 颜色
5. THE Card_Renderer SHALL 渲染 companion 的名称和物种信息

### 需求 4：Companion 观察者

**用户故事：** 作为开发者，我希望 companion 能对 AI 的回复做出反应，以便获得更生动的终端宠物体验。

#### 验收标准

1. THE Observer SHALL 导出 `fireCompanionObserver` 函数，签名为 `(messages: Message[], onReaction: (reaction: string) => void) => Promise<void>`
2. WHEN `fireCompanionObserver` 被调用时，THE Observer SHALL 检查 companion 是否存在且未被静音，若不满足则直接返回
3. WHEN companion 存在且未静音时，THE Observer SHALL 读取最近的对话消息，构造一个包含 companion 性格（personality）和属性（stats）的提示，让 AI 生成一句简短的反应文字（不超过 60 个字符）
4. WHEN AI 成功返回反应文字时，THE Observer SHALL 调用 `onReaction` 回调将反应文字传递给调用方
5. IF AI 调用失败，THEN THE Observer SHALL 静默忽略错误，不影响主流程
6. THE Observer SHALL 在 `src/buddy/observer.ts` 文件中实现，并被 `src/screens/REPL.tsx` 导入调用

### 需求 5：Feature Flag 启用

**用户故事：** 作为开发者，我希望 BUDDY feature flag 在构建时被启用，以便 buddy 功能在运行时可用。

#### 验收标准

1. THE Build_Config SHALL 将 `"BUDDY"` 从 `EXTERNAL_DISABLED_FEATURES` 列表中移除
2. THE Build_Config SHALL 将 `"BUDDY"` 添加到 `ENABLED_FEATURES` 列表中
3. WHEN 构建完成后，THE Build_Config SHALL 使 `feature('BUDDY')` 在运行时返回 `true`

### 需求 6：REPL 集成

**用户故事：** 作为开发者，我希望 REPL 能正确导入和调用 observer 模块，以便 companion 反应功能正常工作。

#### 验收标准

1. THE REPL SHALL 从 `src/buddy/observer.ts` 导入 `fireCompanionObserver` 函数
2. WHEN 每次 AI 回复结束后，THE REPL SHALL 调用 `fireCompanionObserver`，将返回的反应文字写入 `AppState.companionReaction`
3. THE REPL SHALL 在用户滚动查看历史消息时清除 `AppState.companionReaction`（此行为已实现）
