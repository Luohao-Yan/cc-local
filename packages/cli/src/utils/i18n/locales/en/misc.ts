// locales/en/misc.ts
// This file contains translations for smaller modules

// Rate limit options
export const rateLimit = {
  "title": "What do you want to do?",
  "requestMore": "Request more",
  "requestExtraUsage": "Request extra usage",
  "addFunds": "Add funds to continue with extra usage",
  "switchToExtraUsage": "Switch to extra usage",
  "upgradePlan": "Upgrade your plan",
  "stopAndWait": "Stop and wait for limit to reset"
}

// Auto Mode
export const autoMode = {
  "title": "Enable auto mode?",
  "description": "Auto mode lets Claude Code automatically run tools without asking for confirmation each time. You can still review and approve actions.",
  "enable": "Yes, enable auto mode",
  "stayManual": "No, stay in manual mode",
  "yesDefault": "Yes, and make it my default mode",
  "noExit": "No, exit",
  "noGoBack": "No, go back"
}

// Feedback
export const feedback = {
  "continue": "continue",
  "submit": "submit",
  "cancel": "cancel"
}

// Grove
export const grove = {
  "notNow": "Not now",
  "pressAgainToExit": "Press {key} again to exit",
  "toggle": "toggle"
}

// Dev Channels
export const devChannels = {
  "exit": "Exit",
  "title": "WARNING: Loading development channels",
  "warning": "--dangerously-load-development-channels is for local channel development only. Do not use this option to run channels you have downloaded off the internet.",
  "useChannels": "Please use --channels to run a list of approved channels.",
  "channels": "Channels:",
  "localDev": "I am using this for local development"
}

// Mobile
export const mobile = {
  "tabToSwitch": "(tab to switch, esc to close)"
}

// Memory
export const memory = {
  "title": "Memory"
}

// Context
export const context = {
  "freeSpace": "Free space"
}

// Export (using export_ since 'export' is a reserved word)
export const export_ = {
  "copyToClipboard": "Copy to clipboard",
  "copyToClipboardDesc": "Copy the conversation to your system clipboard",
  "saveToFile": "Save to file",
  "saveToFileDesc": "Save the conversation to a file in the current directory",
  "enterFilename": "Enter filename:",
  "copiedToClipboard": "Conversation copied to clipboard",
  "exportedTo": "Conversation exported to: {path}",
  "failed": "Failed to export conversation: {error}",
  "cancelled": "Export cancelled"
}

// Session
export const session = {
  "notInRemoteMode": "Not in remote mode. Start with `claude --remote` to use this command.",
  "pressEscClose": "(press esc to close)",
  "remoteSession": "Remote session",
  "generatingQR": "Generating QR code…",
  "openInBrowser": "Open in browser: "
}

// Worktree
export const worktree = {
  "exitTitle": "Exiting worktree session",
  "keepBoth": "Keep worktree and tmux session",
  "keepWorktreeKillTmux": "Keep worktree, kill tmux session",
  "removeBoth": "Remove worktree and tmux session",
  "keepingProgress": "Keeping worktree…",
  "removingProgress": "Removing worktree…"
}

// Thinkback
export const thinkback = {
  "title": "Think Back on 2025 with Claude Code",
  "subtitle": "Generate your 2025 Claude Code Think Back (takes a few minutes to run)",
  "generateAnimation": "Generate your personalized animation"
}

// Remote Setup
export const remoteSetup = {
  "title": "Connect Claude on the web to GitHub?",
  "checkingStatus": "Checking login status…",
  "connectingGitHub": "Connecting GitHub to Claude…"
}

// Plugins
export const plugins = {
  "title": "Plugins",
  "installedTab": "Installed",
  "marketplacesTab": "Marketplaces"
}

// Auto Updater
export const autoUpdater = {
  "updating": "Auto-updating…",
  "updateInstalled": "✓ Update installed · Restart to apply",
  "updateFailed": "✗ Auto-update failed · Try {command} or {altCommand}"
}

// Ultrareview
export const ultrareview = {
  "billingTitle": "Ultrareview billing",
  "usageExhausted": "Your free ultrareviews for this organization are used. Further reviews bill as Extra Usage (pay-per-use).",
  "proceedBilling": "Proceed with Extra Usage billing",
  "launching": "Launching…"
}

// Tag
export const tag = {
  "removeTitle": "Remove tag?",
  "removeConfirm": "This will remove the tag from the current session.",
  "yesRemove": "Yes, remove tag",
  "noKeep": "No, keep tag"
}

// Cost Threshold
export const costThreshold = {
  "spent": "You've spent ${amount} on the Anthropic API this session.",
  "learnMore": "Learn more about how to monitor your spending:"
}

// Color Picker
export const colorPicker = {
  "automatic": "Automatic color",
  "preview": "Preview: "
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
  "title": "Login",
  "subscriptionPlan": "Subscription Plan (Claude Pro/Max)",
  "apiUsageBilling": "API Usage Billing (Anthropic Console)",
  "thirdPartyPlatform": "3rd-party platform",
  "customProvider": "Custom provider",
  "customProviderDesc": "Configure any API (OpenAI, Anthropic, DeepSeek, Ollama, etc.)"
}

// Approve API Key
export const approveApiKey = {
  "useKey": "Do you want to use this API key?",
  "yes": "Yes",
  "no": "No",
  "recommended": "recommended"
}

// Channel
export const channel = {
  "switchToStable": "Switch to Stable Channel",
  "olderVersionWarning": "The stable channel may have an older version than what you're currently running ({version}).",
  "howToHandle": "How would you like to handle this?",
  "allowDowngrade": "Allow possible downgrade to stable version",
  "stayCurrent": "Stay on current version ({version}) until stable catches up"
}

// ClaudeMd
export const claudeMd = {
  "externalImportTitle": "Allow external CLAUDE.md file imports?",
  "externalImportWarning": "This project's CLAUDE.md imports files outside the current working directory. Never allow this for third-party repositories.",
  "externalImportsLabel": "External imports:",
  "securityRisk": "Important: Only use Claude Code with files you trust. Accessing untrusted files may pose security risks",
  "yesAllowExternal": "Yes, allow external imports",
  "noDisableExternal": "No, disable external imports"
}

// Fast mode
export const fast = {
  "titleOn": "Fast Mode ON",
  "titleOff": "Fast Mode OFF",
  "subtitle": "High-speed mode for {model}. Billed as extra usage at a premium rate. Separate rate limits apply.",
  "turnOn": "Turn on Fast Mode",
  "turnOff": "Turn off Fast Mode",
  "status": "Fast mode {status}"
}
