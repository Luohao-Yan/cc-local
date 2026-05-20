# cc-local 前端功能差距调研报告

> 对标官方 Claude Code npm v2.1.143
> 调研日期: 2026-05-18
> 数据来源: 官方 changelog (https://code.claude.com/docs/en/changelog)
> 调研方法: 逐版本提取用户可见的新功能，与 cc-local 源码对比

---

## 一、新 CLI 标志/选项

| # | 标志 | 引入版本 | 功能 | cc-local 状态 |
|---|------|---------|------|-------------|
| 1 | `--plugin-url <url>` | 2.1.129 | 从 URL 下载插件 zip 并加载 | **已实现** |
| 2 | `--exclude-dynamic-system-prompt-sections` | 2.1.130+ | 将每机器段移到首条用户消息 | **已实现** |
| 3 | `--remote-control-session-name-prefix <prefix>` | 2.1.132+ | RC 会话名前缀(默认hostname) | **已实现** |
| 4 | `CLAUDE_CODE_FORCE_SYNC_OUTPUT=1` | 2.1.129 | 强制同步输出(Emacs eat等) | **已实现** |
| 5 | `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE` | 2.1.129 | Homebrew/WinGet 后台升级提示 | **已实现** |
| 6 | `CLAUDE_CODE_HIDE_CWD` | 2.1.119 | 隐藏启动 logo 中的工作目录 | **已实现** |
| 7 | `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | 2.1.143 | 控制 stop hook 连续阻塞上限(默认8) | **已实现** |

---

## 二、新子命令

| # | 子命令 | 引入版本 | 功能 | cc-local 状态 |
|---|--------|---------|------|-------------|
| 1 | `claude agents` (Agent View) | 2.1.139 | 统一管理所有后台会话(运行/阻塞/完成) | **已实现选项，UI 未验证** |
| 2 | `claude plugin details <name>` | 2.1.139 | 显示插件组件清单和 token 估算 | **已实现** |
| 3 | `claude plugin tag [path]` | 2.1.139+ | 创建发布标签 | **已实现，选项已补齐** |
| 4 | `claude plugin prune` | 2.1.139+ | 清理孤立依赖 | **已实现，选项已补齐** |
| 5 | `claude project purge --all` | 2.1.140+ | 批量清理项目状态 | **已实现** |

---

## 三、新斜杠命令

| # | 命令 | 引入版本 | 功能 | cc-local 状态 |
|---|------|---------|------|-------------|
| 1 | `/goal` | 2.1.139 | 设置完成条件，跨轮次自动执行直到达成；显示实时elapsed/turns/tokens | **已实现** |
| 2 | `/scroll-speed` | 2.1.139 | 调节鼠标滚轮滚动速度(带实时预览) | **已实现** |
| 3 | `/loop` | 2.1.140+ | 循环执行当前提示直到手动停止 | **已实现** |

---

## 四、新设置项

| # | 设置 | 引入版本 | 功能 | cc-local 状态 |
|---|------|---------|------|-------------|
| 1 | `worktree.bgIsolation: "none"` | 2.1.143 | 后台会话直接编辑工作副本(不创建 EnterWorktree 隔离) | **已实现** |
| 2 | `worktree.baseRef: "fresh"\|"head"` | 2.1.133 | 控制 worktree 基准分支(fresh=origin/default, head=当前HEAD) | **已实现** |
| 3 | `sandbox.bwrapPath` / `sandbox.socatPath` | 2.1.133 | Linux/WSL 自定义沙箱二进制路径 | **已实现** |
| 4 | `parentSettingsBehavior: "first-wins"\|"merge"` | 2.1.133 | 父目录 settings 合并策略 | **已实现** |
| 5 | `prUrlTemplate` | 2.1.119 | 自定义 PR 链接模板(指向自定义代码审查URL) | **已实现** |
| 6 | `allowManagedHooksOnly` | 2.1.119+ | 仅允许 managed settings 中的 hooks 运行 | **已实现** |

---

## 五、UI/前端改进

| # | 功能 | 引入版本 | 描述 | cc-local 状态 |
|---|------|---------|------|-------------|
| 1 | 插件依赖强制 | 2.1.143 | `plugin disable` 拒绝当其他插件依赖目标时；`plugin enable` 强制启用传递依赖 | **已实现** |
| 2 | 插件浏览 token 估算 | 2.1.143 | marketplace 浏览面板显示每轮/每次调用的 token 估算 | **已实现** |
| 3 | 插件静默忽略告警 | 2.1.142+ | 当 `plugin.json` 设置了 `silentlyIgnoreDefaultDirs` 时，默认组件目录被静默忽略 | **已实现** |
| 4 | Agent View 右键粘贴修复 | 2.1.143 | 修复 Windows Terminal/WSL 中右键粘贴问题 | N/A (Bug fix) |
| 5 | Stop hook 连续阻塞上限 | 2.1.143 | 连续阻塞8次后自动结束轮次(可配) | **已实现** |
| 6 | `/goal` 实时 overlay | 2.1.139 | 显示 elapsed time/turns/tokens 实时覆盖层 | **已实现** |
| 7 | 插件 projected context cost | 2.1.139 | `plugin details` 和 marketplace 浏览中显示 token 开销估算 | **已实现** |
| 8 | `/loop` 循环执行 | 2.1.140+ | 循环执行当前提示直到用户按 Esc 停止 | **已实现** |
| 9 | 自定义 PR 链接 | 2.1.119 | Footer PR badge 支持自定义 URL 模板 | **已实现** |
| 10 | from-pr 支持 GitLab/Bitbucket | 2.1.119 | `--from-pr` 接受 GitLab MR、Bitbucket PR、GitHub Enterprise URL | **已实现** |

---

## 六、优先级排序与实施建议

### P0 — 核心功能缺失（影响日常使用）

| # | 缺口 | 工作量 | 涉及文件 | 状态 |
|---|------|--------|---------|------|
| 1 | `/goal` 命令 + 实时 overlay | 大 | 新建 commands/goal/, 修改 REPL.tsx | **已完成** |
| 2 | `/loop` 命令 | 中 | 新建 commands/loop/, 修改 REPL.tsx | **已完成** |
| 3 | `CLAUDE_CODE_FORCE_SYNC_OUTPUT` | 小 | 修改 output/stream 逻辑 | **已完成** |
| 4 | `CLAUDE_CODE_HIDE_CWD` | 小 | 修改 LogoV2/WelcomeV2 | **已完成** |
| 5 | `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | 小 | 修改 hook 执行逻辑 | **已完成** |
| 6 | 插件依赖强制 | 中 | 修改 plugin enable/disable 逻辑 | **已完成** |

### P1 — 重要功能（影响完整度）

| # | 缺口 | 工作量 | 涉及文件 | 状态 |
|---|------|--------|---------|------|
| 7 | `worktree.bgIsolation` 设置 | 中 | 修改 worktree 逻辑 + Config.tsx | **已完成** |
| 8 | `worktree.baseRef` 设置 | 中 | 修改 worktree 创建逻辑 + Config.tsx | **已完成** |
| 9 | `sandbox.bwrapPath/socatPath` 设置 | 小 | 修改 sandbox 逻辑 + Config.tsx | **已完成** |
| 10 | `prUrlTemplate` 设置 | 小 | 修改 StatusLine + Config.tsx | **已完成** |
| 11 | `parentSettingsBehavior` 设置 | 中 | 修改 settings 加载逻辑 | **已完成** |
| 12 | `/scroll-speed` 命令 | 小 | 新建 commands/scroll-speed/ | **已完成** |
| 13 | from-pr 支持 GitLab/Bitbucket | 中 | 修改 --from-pr 解析逻辑 | **已完成** |

### P2 — 增强功能（影响体验）

| # | 缺口 | 工作量 | 涉及文件 | 状态 |
|---|------|--------|---------|------|
| 14 | 插件 projected token cost 显示 | 中 | 修改 plugin details + marketplace UI | **已完成** |
| 15 | `allowManagedHooksOnly` 设置 | 小 | 修改 hook 执行逻辑 | **已完成** |
| 16 | 插件静默忽略告警 | 小 | 修改 plugin 加载逻辑 | **已完成** |
| 17 | `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE` | 小 | 修改 auto-update 逻辑 | **已完成** |

---

## 七、不涉及的差异（无需修改）

1. **纯 Bug Fix** — 右键粘贴修复、WebSocket warning 修复等
2. **VS Code 扩展修复** — cc-local 不含 VS Code 扩展
3. **内部/灰度功能** — Voice mode、channels 等仍被 feature gate 控制
4. **已在上轮实现** — `--effort xhigh`、`--plugin-url`、`plugin prune/tag/details`、`project purge --all` 等

---

## 八、实施路线

建议分 3 批执行：

**第一批（P0）**: #3 → #4 → #5 → #6 → #1 → #2
- 先做 3 个环境变量（各 ~15 分钟），再做插件依赖强制，最后做 /goal 和 /loop

**第二批（P1）**: #12 → #10 → #9 → #7 → #8 → #11 → #13
- 先做简单设置，再做复杂设置和 from-pr 扩展

**第三批（P2）**: #15 → #16 → #17 → #14
- 收尾性增强
