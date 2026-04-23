# Migration Plan

目标：

- 让 `packages/*` 在功能与用户体验上逐步追平旧主线
- 最终把正式入口安全切换到新架构

## 原则

1. 不直接切换
   - 在兼容矩阵未收敛前，正式入口继续保持旧主线

2. 先主流程，后边界项
   - 优先迁移用户最常用的 `print / session / mcp / repl`
   - 再迁移 `auth / plugin / update / ide / chrome / tmux`

3. 不做静默降级
   - 新 CLI 未实现的旧参数，必须明确报错或提示
   - 若旧主线已支持且新架构尚未原生实现，则 packages CLI 必须委托到旧主线，保证用户功能不断

4. 每一阶段都要有验证基线
   - 单元测试
   - 集成测试
   - smoke 脚本

## 阶段划分

### Phase 0：基线冻结

目标：

- 固定正式入口
- 固定切换门槛
- 明确迁移矩阵

输出物：

- [/Users/yanluohao/开发/cc-local/MIGRATION_MATRIX.md](/Users/yanluohao/开发/cc-local/MIGRATION_MATRIX.md)
- [/Users/yanluohao/开发/cc-local/CLI_COMPATIBILITY_CHECKLIST.md](/Users/yanluohao/开发/cc-local/CLI_COMPATIBILITY_CHECKLIST.md)

完成标准：

- 团队对“不能直接切”的原因和门槛没有歧义

### Phase 1：高频 CLI 兼容

目标：

- 把最常用的非交互工作流先迁过去

任务：

1. 补 `packages/cli` 输出兼容参数
   - `--output-format=json`
   - `--output-format=stream-json`
   - `--include-partial-messages`
   - `--replay-user-messages`

2. 补 `packages/cli` 会话续接参数
   - `--resume`
   - `--continue`
   - `--fork-session`

3. 补错误提示
   - 对未实现的旧参数给统一兼容提示

建议写入文件：

- `/Users/yanluohao/开发/cc-local/packages/cli/src/index.ts`
- `/Users/yanluohao/开发/cc-local/packages/cli/src/client/CCLocalClient.ts`
- `/Users/yanluohao/开发/cc-local/packages/cli/src/index.test.ts`

完成标准：

- 新 CLI 可覆盖“单次调用 + 续接会话”的主路径

### Phase 2：REPL 与会话体验对齐

目标：

- 让新 CLI 真正具备日常交互使用能力

任务：

1. 强化 `packages/cli` REPL
   - 历史会话续接
   - 中断处理
   - 基础 slash-like 本地命令

2. 补会话管理命令的旧式体验
   - 更接近旧 CLI 的 resume/use 语义

3. 建立新 CLI 的 REPL smoke

建议写入文件：

- `/Users/yanluohao/开发/cc-local/packages/cli/src/repl/simpleRepl.ts`
- `/Users/yanluohao/开发/cc-local/packages/cli/src/repl/repl.tsx`
- `/Users/yanluohao/开发/cc-local/packages/cli/src/index.test.ts`

完成标准：

- 新 CLI 能承担基础日常聊天与续接工作流

### Phase 3：MCP 与工具生态对齐

目标：

- 保持新架构的优势，同时补旧能力缺口

任务：

1. 补 MCP `http` transport
2. 明确动态工具加载策略
3. 为新 CLI 增加 MCP smoke
4. 梳理和旧主线的工具选择差异

建议写入文件：

- `/Users/yanluohao/开发/cc-local/packages/core/src/mcp/*`
- `/Users/yanluohao/开发/cc-local/packages/server/src/api/*`
- `/Users/yanluohao/开发/cc-local/packages/cli/src/index.ts`

完成标准：

- 新架构在 MCP 这条线上不弱于旧主线

当前进展：

- 已完成 `http` transport
- 已具备 `mcp add-http`
- 已有新 CLI MCP smoke 基线
- 已补 `sessions continue`
- 已补 `sessions fork`
- 已补最小 `doctor`
- 已补最小 `config`
- 已补最小 `context`
- 已补最小 `env`
- 已补最小 `stats`
- 已补最小 `cost`
- 已补最小 `permissions`
- 已补最小 `model list/current/use`
- 已补最小 `auth status/login/logout`
- 已补最小 `setup-token`
- 已补最小 `plugin list/validate`
- 已补最小 `plugin install/update/uninstall`
- 已补最小 `update/upgrade`
- 已补 `--permission-mode` / `--dangerously-skip-permissions` 工具执行策略底座
- 已补 packages CLI legacy fallback，用于兜底尚未原生迁移的 `src/*` 功能
- 下一步重点转回更高频的旧 CLI 命令面与 REPL 体验迁移

### Phase 4：认证、插件、更新迁移

目标：

- 解决阻塞正式替换的系统级能力

任务：

1. 设计新 CLI 的认证命令面
   - `auth status`
   - `auth login/logout`
   - `setup-token`

2. 设计插件兼容策略
   - 至少补 `validate/list/install/update/uninstall`

3. 设计升级策略
   - `update|upgrade`

完成标准：

- 新 CLI 不再缺关键系统能力

### Phase 5：高边界集成迁移

目标：

- 补齐最难替换的用户环境集成

任务：

1. `--ide`
2. `--chrome`
3. `--tmux`
4. `--worktree`
5. 权限审批 UI

完成标准：

- 高频外部集成功能具备替代性

### Phase 6：灰度切换

目标：

- 不影响现有用户的前提下切到新架构

任务：

1. 增加新架构候选入口
   - 例如内测期 `cclocal-next`

2. 跑迁移矩阵验收
3. 准备回滚方案
4. 切换：
   - `bun run start`
   - `dist/cli.js`
   - `cclocal`

完成标准：

- 正式入口切换完成，旧主线仅保留回滚窗口

## 当前立刻执行的任务

### Batch A

范围：

- `packages/cli` 输出兼容层
- `packages/cli` 会话续接兼容层

任务：

1. 为 `packages/cli` 添加旧式参数解析
2. 为未实现参数添加明确报错
3. 为 `--resume` / `--continue` 提供实际行为
4. 为 `--fork-session` 设计最小实现

当前状态：

- 已开始执行
- 已完成：
  - `--resume`
  - `--continue`
  - `--output-format=json`
  - `--output-format=stream-json`
  - `--include-partial-messages`
  - `--replay-user-messages`
  - `--fork-session`
  - `--no-session-persistence`
  - REPL 最小 slash command 集
  - 未实现参数的明确兼容报错
- 下一步：
  - 收窄 `stream-json` 与旧主线的事件细节差异
  - 继续补 REPL/权限/slash-command 兼容

### Batch B

范围：

- 新 CLI smoke 基线

任务：

1. 新增 `scripts/smoke-packages-cli.sh`
2. 覆盖：
   - `--help`
   - `--print`
   - `sessions`
   - `mcp`
   - `models`

当前状态：

- 已补独立 smoke 脚本：
  - [/Users/yanluohao/开发/cc-local/scripts/smoke-packages-cli.sh](/Users/yanluohao/开发/cc-local/scripts/smoke-packages-cli.sh)

### Batch C

范围：

- 新旧切换准入条件

任务：

1. 每完成一个迁移点，就回填 `MIGRATION_MATRIX.md`
2. 只要仍有核心 `missing`，就不允许切正式入口

## 当前不直接做的事项

这些不是不做，而是当前不放在第一批：

- 先重写整个旧命令体系
- 先实现所有插件能力
- 先迁移所有 IDE/Chrome/tmux 集成
- 先切正式入口

原因：

- 会拖慢最核心主流程的迁移速度
- 会把“可替代性”目标变成无限扩张
