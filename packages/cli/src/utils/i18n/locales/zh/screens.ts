// locales/zh/screens.ts

// Doctor 诊断页
export const doctor = {
  "checking": "正在检查安装状态…",
  "diagnostics": "诊断信息",
  "currentlyRunning": "当前运行：",
  "packageManager": "包管理器：",
  "path": "路径：",
  "invoked": "调用：",
  "configInstallMethod": "配置安装方式：",
  "search": "搜索：",
  "searchOk": "正常",
  "searchNotWorking": "不可用",
  "searchBundled": "内置",
  "searchVendor": "供应商",
  "searchSystem": "系统",
  "recommendation": "建议：",
  "warningMultipleInstallations": "警告：检测到多个安装",
  "installationAt": "位于",
  "invalidSettings": "无效的设置",
  "updates": "更新",
  "autoUpdates": "自动更新：",
  "managedByPackageManager": "由包管理器管理",
  "updatePermissions": "更新权限：",
  "updatePermissionsYes": "是",
  "updatePermissionsNoSudo": "否（需要 sudo）",
  "autoUpdateChannel": "自动更新通道：",
  "failedToFetchVersions": "获取版本信息失败",
  "stableVersion": "稳定版本：",
  "latestVersion": "最新版本：",
  "environmentVariables": "环境变量",
  "versionLocks": "版本锁定",
  "cleanedStaleLocks": "已清理 {count} 个过期锁定",
  "noActiveVersionLocks": "没有活跃的版本锁定",
  "agentParseErrors": "代理解析错误",
  "failedToParseAgentFiles": "解析 {count} 个代理文件失败：",
  "pluginErrors": "插件错误",
  "pluginErrorsDetected": "检测到 {count} 个插件错误：",
  "unreachablePermissionRules": "不可达的权限规则",
  "contextUsageWarnings": "上下文使用警告",
  "files": "文件：",
  "topContributors": "主要贡献：",
  "mcpServers": "MCP 服务器：",
  "warning": "警告：",
  "fix": "修复：",
  "running": "(运行中)",
  "stale": "(过期)",
  "dismissed": "已关闭 Claude Code 诊断",
}

// 恢复对话页
export const resume = {
  "loading": "正在加载对话…",
  "resuming": "正在恢复对话…",
  "noConversations": "没有找到可恢复的对话。",
  "pressCtrlC": "按 Ctrl+C 退出并开始新对话。",
  "differentDirectory": "此对话来自不同的目录。",
  "toResumeRun": "如需恢复，请运行：",
  "commandCopied": "（命令已复制到剪贴板）",
  "failedToLoad": "加载对话失败",
}

// REPL 交互页
export const repl = {
  // 详细记录页脚
  "showingTranscript": "正在显示详细记录",
  "toToggle": "切换",
  "navigate": "n/N 导航",
  "scroll": "滚动",
  "homeEnd": "home/end 顶部/底部",
  "collapse": "收起",
  "showAll": "显示全部",

  // 搜索
  "indexing": "正在索引…",
  "indexedIn": "索引完成，耗时 {ms}ms",
  "noMatches": "无匹配",

  // 会话状态
  "approve": "审批",
  "workerRequest": "工作请求",
  "sandboxRequest": "沙箱请求",
  "dialogOpen": "对话框已打开",
  "inputNeeded": "等待输入",

  // 通知
  "sandboxDisabled": "沙箱已禁用",
  "sandboxCommand": "/sandbox",
  "sandboxRequired": "错误：需要沙箱但不可用：{reason}",
  "sandboxRefuse": "sandbox.failIfUnavailable 已设置 — 拒绝在没有可用沙箱的情况下启动。",
  "sandboxError": "沙箱错误：",
  "failedToResumeAgent": "恢复代理失败：",
  "copied": "已复制",
  "waitingForInput": "Claude 正在等待您的输入",
  "newTask": "新任务？",
  "clearCommand": "/clear",
  "toSave": "节省",
  "tokens": "令牌",
  "suspended": "Claude Code 已挂起。运行 `fg` 可恢复 Claude Code。",
  "suspendNote": "注意：ctrl + z 现在用于挂起 Claude Code，ctrl + _ 用于撤销输入。",
  "conversationSummarized": "对话已摘要（{shortcut} 查看历史）",
  "snippedMessage": "该消息已不在活动上下文中（已被裁剪或压缩前移除）。请选择更新的消息。",
  "networkConnectionQuestion": "允许连接到 {host}？",
  "networkAccessTool": "网络访问",
  "waitingForLeader": "正在等待主进程审批对 {host} 的网络访问",
  "rendering": "正在渲染",
  "messages": "条消息…",
  "opening": "正在打开",
  "wrote": "已写入",
  "noEditorSet": "未设置 $VISUAL/$EDITOR",
  "renderFailed": "渲染失败：",
  "promptCancelled": "用户取消了提示",

  // 钩子
  "runningHook": "正在运行 {hookType} 钩子",
  "runningHooks": "正在运行停止钩子…",
  "hookSubagentStop": "子代理停止",
  "hookStop": "停止",
  "hook": "钩子",

  // 工作树
  "worktreeTip": "工作树创建耗时 {secs} 秒。对于大型仓库，可在 .claude/settings.json 中设置 `worktree.sparsePaths` 以仅检出所需目录 — 例如 `{\"worktree\": {\"sparsePaths\": [\"src\", \"packages/foo\"]}}`。",

  // 反馈调查
  "memoryFeedback": "Claude 的记忆使用效果如何？（可选）",
}
