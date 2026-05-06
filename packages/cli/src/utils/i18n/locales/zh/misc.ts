// locales/zh/misc.ts
// This file contains translations for smaller modules

// Rate limit options
export const rateLimit = {
  "title": "您想怎么做？",
  "requestMore": "申请更多",
  "requestExtraUsage": "申请额外用量",
  "addFunds": "充值以继续使用额外用量",
  "switchToExtraUsage": "切换到额外用量",
  "upgradePlan": "升级您的套餐",
  "stopAndWait": "停止并等待限额重置"
}

// Auto Mode
export const autoMode = {
  "title": "启用自动模式？",
  "description": "自动模式让 Claude Code 自动运行工具而无需每次确认。您仍可以查看和批准操作。",
  "enable": "是，启用自动模式",
  "stayManual": "否，保持手动模式",
  "yesDefault": "是，并设为默认模式",
  "noExit": "否，退出",
  "noGoBack": "否，返回"
}

// Feedback
export const feedback = {
  "continue": "继续",
  "submit": "提交",
  "cancel": "取消"
}

// Grove
export const grove = {
  "notNow": "暂不",
  "pressAgainToExit": "再按 {key} 退出",
  "toggle": "切换"
}

// Dev Channels
export const devChannels = {
  "exit": "退出",
  "title": "警告：正在加载开发通道",
  "warning": "--dangerously-load-development-channels 仅用于本地通道开发。请勿使用此选项运行从互联网下载的通道。",
  "useChannels": "请使用 --channels 运行已批准的通道列表。",
  "channels": "通道：",
  "localDev": "我正在用于本地开发"
}

// Mobile
export const mobile = {
  "tabToSwitch": "(Tab 切换，Esc 关闭)"
}

// Memory
export const memory = {
  "title": "记忆"
}

// Context
export const context = {
  "freeSpace": "可用空间"
}

// Export
export const exp = {
  "copyToClipboard": "复制到剪贴板",
  "copyToClipboardDesc": "将对话复制到系统剪贴板",
  "saveToFile": "保存到文件",
  "saveToFileDesc": "将对话保存到当前目录的文件",
  "enterFilename": "输入文件名：",
  "copiedToClipboard": "对话已复制到剪贴板",
  "exportedTo": "对话已导出到：{path}",
  "failed": "导出对话失败：{error}",
  "cancelled": "导出已取消"
}

// Session
export const session = {
  "notInRemoteMode": "不在远程模式下。请使用 `claude --remote` 启动来使用此命令。",
  "pressEscClose": "(按 esc 关闭)",
  "remoteSession": "远程会话",
  "generatingQR": "正在生成二维码…",
  "openInBrowser": "在浏览器中打开："
}

// Worktree
export const worktree = {
  "exitTitle": "正在退出工作树会话",
  "keepBoth": "保留工作树和 tmux 会话",
  "keepWorktreeKillTmux": "保留工作树，关闭 tmux 会话",
  "removeBoth": "删除工作树和 tmux 会话",
  "keepingProgress": "正在保留工作树…",
  "removingProgress": "正在删除工作树…"
}

// Thinkback
export const thinkback = {
  "title": "用 Claude Code 回顾 2025",
  "subtitle": "生成您的 2025 Claude Code 回顾（需要几分钟）",
  "generateAnimation": "生成您的个性化动画"
}

// Remote Setup
export const remoteSetup = {
  "title": "将 Claude 网页版连接到 GitHub？",
  "checkingStatus": "正在检查登录状态…",
  "connectingGitHub": "正在连接 GitHub 到 Claude…"
}

// Plugins
export const plugins = {
  "title": "插件",
  "installedTab": "已安装",
  "marketplacesTab": "市场"
}

// Auto Updater
export const autoUpdater = {
  "updating": "正在自动更新…",
  "updateInstalled": "✓ 更新已安装 · 重启以应用",
  "updateFailed": "✗ 自动更新失败 · 尝试 {command} 或 {altCommand}"
}

// Ultrareview
export const ultrareview = {
  "billingTitle": "Ultrareview 计费",
  "usageExhausted": "您的组织免费 ultrareviews 已用完。后续审核将按额外用量计费（按使用付费）。",
  "proceedBilling": "继续使用额外用量计费",
  "launching": "正在启动…"
}

// Tag
export const tag = {
  "removeTitle": "移除标签？",
  "removeConfirm": "这将从当前会话中移除标签。",
  "yesRemove": "是，移除标签",
  "noKeep": "否，保留标签"
}

// Cost Threshold
export const costThreshold = {
  "spent": "本次会话您已在 Anthropic API 上花费 ${amount}。",
  "learnMore": "了解更多关于如何监控您的支出："
}

// Color Picker
export const colorPicker = {
  "automatic": "自动颜色",
  "preview": "预览："
}

// Help
export const help = {
  "title": "Help",
  "tabGeneral": "general",
  "tabCommands": "commands",
  "tabCustomCommands": "custom-commands",
  "tabKeybindings": "keybindings",
  "browseCommands": "Browse default commands:",
  "browseCustomCommands": "Browse custom commands:",
  "browseKeybindings": "Browse keybindings:",
  "noCommands": "No commands found",
  "noKeybindings": "No custom keybindings",
  "dialogDismissed": "帮助对话框已关闭"
}

// Login
export const login = {
  "title": "登录",
  "subscriptionPlan": "Subscription Plan (Claude Pro/Max)",
  "apiUsageBilling": "API Usage Billing (Anthropic Console)",
  "thirdPartyPlatform": "3rd-party platform",
  "customProvider": "Custom provider",
  "customProviderDesc": "Configure any API (OpenAI, Anthropic, DeepSeek, Ollama, etc.)"
}

// Approve API Key
export const approveApiKey = {
  "useKey": "您想使用此 API 密钥吗？",
  "yes": "是",
  "no": "否",
  "recommended": "推荐"
}

// Channel
export const channel = {
  "switchToStable": "切换到稳定通道",
  "olderVersionWarning": "稳定通道可能比您当前运行的版本 ({version}) 更旧。",
  "howToHandle": "您想如何处理？",
  "allowDowngrade": "允许降级到稳定版本",
  "stayCurrent": "保持当前版本 ({version}) 直到稳定通道追赶上来"
}

// ClaudeMd
export const claudeMd = {
  "externalImportTitle": "允许外部 CLAUDE.md 文件导入？",
  "externalImportWarning": "此项目的 CLAUDE.md 导入了当前工作目录之外的文件。切勿对第三方仓库允许此操作。",
  "externalImportsLabel": "外部导入：",
  "securityRisk": "重要提示：仅对您信任的文件使用 Claude Code。访问不受信任的文件可能存在安全风险",
  "yesAllowExternal": "是，允许外部导入",
  "noDisableExternal": "否，禁用外部导入"
}

// Fast mode
export const fast = {
  "titleOn": "快速模式已开启",
  "titleOff": "快速模式已关闭",
  "subtitle": "{model} 的高速模式。按额外用量计费，费率较高。适用单独的限额。",
  "turnOn": "开启快速模式",
  "turnOff": "关闭快速模式",
  "status": "快速模式 {status}"
}
