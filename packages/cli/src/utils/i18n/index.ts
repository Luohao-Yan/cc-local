/**
 * i18n Core Module for cc-local
 *
 * Provides UI language translation support with auto-detection.
 * Supports: en (English), zh (Chinese)
 *
 * IMPORTANT: Translations are embedded directly in code to ensure
 * they work after bundling (no external file dependencies).
 */

export type UILanguage = 'en' | 'zh'
export type TranslationKey = string

// Embedded translations - no external file dependencies
const translations: Record<UILanguage, Record<string, string>> = {
  en: {
    // Welcome screen
    "welcome.title": "Welcome back!",
    "welcome.titleWithName": "Welcome back {name}!",
    "welcome.recentActivity": "Recent activity",
    "welcome.whatsNew": "What's new",
    "welcome.tipsTitle": "Tips for getting started",
    "welcome.noRecentActivity": "No recent activity",
    "welcome.resumeForMore": "/resume for more",
    "welcome.releaseNotesForMore": "/release-notes for more",

    // Shortcuts
    "shortcuts.hint": "/help for shortcuts",

    // Config settings
    "config.theme": "Color theme for the UI",
    "config.editorMode": "Editor mode",
    "config.verbose": "Show detailed debug output",
    "config.preferredNotifChannel": "Preferred notification channel",
    "config.autoCompactEnabled": "Auto-compact when context is full",
    "config.autoMemoryEnabled": "Enable auto-memory",
    "config.autoDreamEnabled": "Enable background memory consolidation",
    "config.fileCheckpointingEnabled": "Enable file checkpointing for code rewind",
    "config.showTurnDuration": "Show turn duration message after responses",
    "config.terminalProgressBarEnabled": "Show OSC 9;4 progress indicator in supported terminals",
    "config.todoFeatureEnabled": "Enable todo/task tracking",
    "config.model": "Override the default model",
    "config.alwaysThinkingEnabled": "Enable extended thinking (false to disable)",
    "config.permissionsDefaultMode": "Default permission mode for tool usage",
    "config.language": "Preferred language for Claude responses and voice dictation",
    "config.uiLanguage": "UI display language",
    "config.uiLanguage.auto": "Auto (detect system)",
    "config.uiLanguage.en": "English",
    "config.uiLanguage.zh": "Chinese (中文)",
    "config.teammateMode": "How to spawn teammates",
    "config.languageSetting": "Language",
    "config.uiLanguageSetting": "UI Language",

    // Settings labels
    "settings.autoCompact": "Auto-compact context",
    "settings.showTips": "Show tips",
    "settings.reduceMotion": "Reduce motion",
    "settings.thinkingMode": "Thinking mode",
    "settings.fastMode": "Fast mode ({model} only)",
    "settings.promptSuggestions": "Prompt suggestions",
    "settings.rewindCode": "Rewind code (checkpoints)",
    "settings.verboseOutput": "Verbose output",
    "settings.terminalProgressBar": "Terminal progress bar",
    "settings.showTurnDuration": "Show turn duration",
    "settings.defaultPermissionMode": "Default permission mode",
    "settings.permissionMode.default": "Default",
    "settings.permissionMode.plan": "Plan Mode",
    "settings.permissionMode.acceptEdits": "Accept edits",
    "settings.permissionMode.bypassPermissions": "Bypass Permissions",
    "settings.useAutoModeDuringPlan": "Use auto mode during plan",
    "settings.respectGitignore": "Respect .gitignore in file picker",
    "settings.copyFullResponse": "Always copy full response (skip /copy picker)",
    "settings.copyOnSelect": "Copy on select",
    "settings.autoUpdateChannel": "Auto-update channel",
    "settings.disabled": "disabled",
    "settings.theme": "Theme",
    "settings.notifications": "Notifications",
    "settings.notifChannel.auto": "Auto",
    "settings.notifChannel.iterm2": "iTerm2 (OSC 9)",
    "settings.notifChannel.terminal_bell": "Terminal Bell (\\a)",
    "settings.notifChannel.kitty": "Kitty (OSC 99)",
    "settings.notifChannel.ghostty": "Ghostty (OSC 777)",
    "settings.notifChannel.iterm2_with_bell": "iTerm2 + Bell",
    "settings.notifChannel.notifications_disabled": "Disabled",
    "settings.localNotifications": "Local notifications",
    "settings.pushWhenIdle": "Push when idle",
    "settings.pushWhenInputNeeded": "Push when input needed",
    "settings.pushWhenClaudeDecides": "Push when Claude decides",
    "settings.outputStyle": "Output style",
    "settings.defaultView": "What you see by default",
    "settings.language": "Language",
    "settings.uiLanguage": "UI Language",
    "settings.editorMode": "Editor mode",
    "settings.model": "Model",
    "settings.teammateModel": "Teammate model",
    "settings.speculationEnabled": "Speculative execution",
    "settings.showStatusInTerminalTab": "Show status in terminal tab",
    "settings.showPrStatusFooter": "Show PR status footer",
    "settings.diffTool": "Diff tool",
    "settings.autoConnectIde": "Auto-connect to IDE (external terminal)",
    "settings.autoInstallIdeExtension": "Auto-install IDE extension",
    "settings.claudeInChromeDefaultEnabled": "Claude in Chrome enabled by default",
    "settings.teammateMode": "Teammate mode",
    "settings.teammateModeOverridden": "Teammate mode [overridden: {mode}]",
    "settings.defaultTeammateModel": "Default teammate model",
    "settings.remoteControlAtStartup": "Enable Remote Control for all sessions",
    "settings.externalIncludes": "External CLAUDE.md includes",
    "settings.useCustomApiKey": "Use custom API key",
    "settings.searchPlaceholder": "Search settings…",
    "settings.tab.status": "Status",
    "settings.tab.config": "Config",
    "settings.tab.usage": "Usage",
    "settings.defaultRecommended": "Default (recommended)",
    "settings.language.default": "Default (English)",

    // Status tab
    "status.version": "Version",
    "status.sessionName": "Session name",
    "status.sessionId": "Session ID",
    "status.cwd": "cwd",
    "status.model": "Model",
    "status.renameToAddName": "/rename to add a name",

    // Change set messages (for handleSaveAndClose)
    "changeSet.setTo": "Set {key} to {value}",
    "changeSet.customApiKeyEnabled": "Enabled custom API key",
    "changeSet.customApiKeyDisabled": "Disabled custom API key",
    "changeSet.themeSet": "Set theme to {value}",
    "changeSet.notificationsSet": "Set notifications to {value}",
    "changeSet.outputStyleSet": "Set output style to {value}",
    "changeSet.languageSet": "Set response language to {value}",
    "changeSet.editorModeSet": "Set editor mode to {value}",
    "changeSet.diffToolSet": "Set diff tool to {value}",
    "changeSet.autoConnectIdeEnabled": "Enabled auto-connect to IDE",
    "changeSet.autoConnectIdeDisabled": "Disabled auto-connect to IDE",
    "changeSet.autoInstallIdeExtensionEnabled": "Enabled auto-install IDE extension",
    "changeSet.autoInstallIdeExtensionDisabled": "Disabled auto-install IDE extension",
    "changeSet.autoCompactEnabled": "Enabled auto-compact",
    "changeSet.autoCompactDisabled": "Disabled auto-compact",
    "changeSet.respectGitignoreEnabled": "Enabled respect .gitignore in file picker",
    "changeSet.respectGitignoreDisabled": "Disabled respect .gitignore in file picker",
    "changeSet.copyFullResponseEnabled": "Enabled always copy full response",
    "changeSet.copyFullResponseDisabled": "Disabled always copy full response",
    "changeSet.copyOnSelectEnabled": "Enabled copy on select",
    "changeSet.copyOnSelectDisabled": "Disabled copy on select",
    "changeSet.terminalProgressBarEnabled": "Enabled terminal progress bar",
    "changeSet.terminalProgressBarDisabled": "Disabled terminal progress bar",
    "changeSet.terminalTabStatusEnabled": "Enabled terminal tab status",
    "changeSet.terminalTabStatusDisabled": "Disabled terminal tab status",
    "changeSet.turnDurationEnabled": "Enabled turn duration",
    "changeSet.turnDurationDisabled": "Disabled turn duration",
    "changeSet.remoteControlReset": "Reset Remote Control to default",
    "changeSet.remoteControlEnabled": "Enabled Remote Control for all sessions",
    "changeSet.remoteControlDisabled": "Disabled Remote Control for all sessions",
    "changeSet.autoUpdateChannelSet": "Set auto-update channel to {value}",
    "changeSet.configDismissed": "Config dialog dismissed",

    // IDE
    "ide.selectTitle": "Select IDE",
    "ide.selectSubtitle": "Connect to an IDE for integrated development features.",
    "ide.noAvailableIDEs": "No available IDEs detected. Make sure your IDE has the Claude Code extension or plugin installed and is running.",
    "ide.noAvailableIDEsJetBrains": "No available IDEs detected. Please install the plugin and restart your IDE:\nhttps://docs.claude.com/s/claude-code-jetbrains",
    "ide.selectToInstall": "Select IDE to install extension",
    "ide.none": "None",
    "ide.autoConnectTitle": "Do you wish to enable auto-connect to IDE?",
    "ide.autoConnectHint": "You can also configure this in /config or with the --ide flag",
    "ide.disableAutoConnectTitle": "Do you wish to disable auto-connect to IDE?",
    "ide.disableAutoConnectHint": "You can also configure this in /config",

    // Chrome
    "chrome.title": "Claude in Chrome (Beta)",
    "chrome.description": "Claude in Chrome works with the Chrome extension to let you control your browser directly from Claude Code. Navigate websites, fill forms, capture screenshots, record GIFs, and debug with console logs and network requests.",
    "chrome.installExtension": "Install Chrome extension",
    "chrome.managePermissions": "Manage permissions",
    "chrome.reconnectExtension": "Reconnect extension",
    "chrome.status": "Status",
    "chrome.extension": "Extension",
    "chrome.enabled": "Enabled",
    "chrome.disabled": "Disabled",
    "chrome.installed": "Installed",
    "chrome.notDetected": "Not detected",
    "chrome.enabledByDefault": "Enabled by default: {status}",
    "chrome.yes": "Yes",
    "chrome.no": "No",
    "chrome.installHint": "Once installed, select \"Reconnect extension\" to connect.",
    "chrome.permissionsInfo": "Site-level permissions are inherited from the Chrome extension. Manage permissions in the Chrome extension settings to control which sites Claude can browse, click, and type on.",
    "chrome.learnMore": "Learn more: https://code.claude.com/docs/en/chrome",
    "chrome.wslNotSupported": "Claude in Chrome is not supported in WSL at this time.",
    "chrome.requiresSubscription": "Claude in Chrome requires a claude.ai subscription.",
    "chrome.usageHint": "Usage: claude --chrome or claude --no-chrome",

    // Login
    "login.title": "Login",
    "settings.autoUpdateEnableLatest": "Enable with latest channel",
    "settings.autoUpdateEnableStable": "Enable with stable channel",
    "settings.uiLanguageTitle": "UI Language",
    "settings.uiLanguageDesc": "Select the language for the user interface.",
    "settings.uiLanguageDetected": "Detected system language",
    "settings.autoUpdatesEnvControlled": "Auto-updates are controlled by an environment variable and cannot be changed here.",
    "settings.autoUpdatesDisabledDev": "Auto-updates are disabled in development builds.",
    "settings.unsetEnvToEnable": "Unset {envVar} to re-enable auto-updates.",
    "settings.enableAutoUpdates": "Enable Auto-Updates",

    // Command descriptions (shown in help menu and command list)
    "command.description.init": "Initialize a new CLAUDE.md file with codebase documentation",
    "command.description.init-new": "Initialize new CLAUDE.md file(s) and optional skills/hooks with codebase documentation",
    "command.description.add-dir": "Add a new working directory",
    "command.description.agents": "Manage agent configurations",
    "command.description.branch": "Create a branch of the current conversation at this point",
    "command.description.btw": "Ask a quick side question without interrupting the main conversation",
    "command.description.dream": "Manually trigger memory consolidation",
    "command.description.clear": "Clear conversation history and free up context",
    "command.description.config": "Open config panel",
    "command.description.commit": "Create a git commit",
    "command.description.commit-push-pr": "Commit, push, and open a PR",
    "command.description.context": "Visualize current context usage as a colored grid",
    "command.description.cost": "Show the total cost and duration of the current session",
    "command.description.desktop": "Continue the current session in Claude Desktop",
    "command.description.diff": "View uncommitted changes and per-turn diffs",
    "command.description.doctor": "Diagnose and verify your Claude Code installation and settings",
    "command.description.exit": "Exit the REPL",
    "command.description.export": "Export the current conversation to a file or clipboard",
    "command.description.files": "List all files currently in context",
    "command.description.help": "Show help and available commands",
    "command.description.ide": "Manage IDE integrations and show status",
    "command.description.keybindings": "Open or create your keybindings configuration file",
    "command.description.logout": "Sign out from your Anthropic account",
    "command.description.mcp": "Manage MCP servers",
    "command.description.memory": "Edit Claude memory files",
    "command.description.model": "Switch or configure the model",
    "command.description.permissions": "Manage allow & deny tool permission rules",
    "command.description.resume": "Resume a previous session",
    "command.description.usage": "Show plan usage limits",
    "command.description.vim": "Toggle between Vim and Normal editing modes",
    "command.description.voice": "Toggle voice mode",
    "command.description.brief": "Toggle brief-only mode",
    "command.description.hooks": "View hook configurations for tool events",
    "command.description.chrome": "Claude in Chrome (Beta) settings",
    "command.description.effort": "Set effort level for model usage",
    "command.description.color": "Set the prompt bar color for this session",
    "command.description.mobile": "Show QR code to download the Claude mobile app",
    "command.description.bridge": "Connect this terminal for remote-control sessions",
    "command.description.extra-usage": "Configure extra usage to keep working when limits are hit",
    "command.description.buddy": "Hatch a coding companion",
    "command.description.insights": "Generate a report analyzing your Claude Code sessions",
    "command.description.install": "Install Claude Code native build",
    "command.description.install-github-app": "Set up Claude GitHub Actions for a repository",
    "command.description.install-slack-app": "Install the Claude Slack app",
    "command.description.heapdump": "Dump the JS heap to ~/Desktop",
    "command.description.advisor": "Configure the advisor model",

    // Keyboard shortcut action labels
    "shortcut.to": "to",
    "shortcut.action.interrupt": "interrupt",
    "shortcut.action.stop-agents": "stop agents",
    "shortcut.action.show-tasks": "show tasks",
    "shortcut.action.hide-tasks": "hide tasks",
    "shortcut.action.show-teammates": "show teammates",
    "shortcut.action.hide": "hide",
    "shortcut.action.cancel": "cancel",
    "shortcut.action.confirm": "confirm",
    "shortcut.action.expand": "expand",
    "shortcut.action.select": "select",
    "shortcut.action.navigate": "navigate",
    "shortcut.action.toggle": "toggle",
    "shortcut.action.cycle-modes": "cycle modes",
    "shortcut.action.auto-accept-edits": "auto-accept edits",
    "shortcut.action.accept": "accept",
    "shortcut.action.reject": "reject",
    "shortcut.action.submit": "submit",
    "shortcut.action.return-team-lead": "return to team lead",

    // Common UI
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.save": "Save",
    "common.loading": "Loading...",
    "common.done": "Done",
    "common.error": "Error",
    "common.success": "Success",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.close": "Close",
    "common.reset": "Reset",
    "common.auto": "Auto",
    "common.default": "Default",

    // Errors
    "error.generic": "An error occurred",
    "error.notFound": "Not found",
    "error.permissionDenied": "Permission denied",
    "error.cancelled": "Cancelled",

    // Spinner
    "spinner.thinking": "Thinking...",
    "spinner.processing": "Processing...",
    "spinner.cookedFor": "Cooked for {duration}",
    "spinner.idle": "Idle",
    "spinner.teammatesRunning": "teammates running",
    "spinner.workedFor": "Worked for {duration}",
    "spinner.idleFor": "Idle for {duration}",
    "spinner.pastTenseFor": "{verb} for {duration}",

    // Login
    "login.title": "Login",
    "login.subscriptionPlan": "Subscription Plan (Claude Pro/Max)",

    // Memory
    "memory.title": "Memory",

    // Rate limit options
    "rateLimit.title": "What do you want to do?",
    "rateLimit.requestMore": "Request more",
    "rateLimit.requestExtraUsage": "Request extra usage",
    "rateLimit.addFunds": "Add funds to continue with extra usage",
    "rateLimit.switchToExtraUsage": "Switch to extra usage",
    "rateLimit.upgradePlan": "Upgrade your plan",
    "rateLimit.stopAndWait": "Stop and wait for limit to reset",

    // Remote setup
    "remoteSetup.title": "Connect Claude on the web to GitHub?",
    "remoteSetup.checkingStatus": "Checking login status…",
    "remoteSetup.connectingGitHub": "Connecting GitHub to Claude…",

    // Tag
    "tag.removeTitle": "Remove tag?",
    "tag.removeConfirm": "This will remove the tag from the current session.",
    "tag.yesRemove": "Yes, remove tag",
    "tag.noKeep": "No, keep tag",

    // Thinkback
    "thinkback.title": "Think Back on 2025 with Claude Code",
    "thinkback.subtitle": "Generate your 2025 Claude Code Think Back (takes a few minutes to run)",
    "thinkback.generateAnimation": "Generate your personalized animation",

    // Model Add
    "modelAdd.step1": "Step 1/5 · API Endpoint",
    "modelAdd.step2": "Step 2/5 · API Format",
    "modelAdd.step3": "Step 3/5 · API Key",
    "modelAdd.step4": "Step 4/5 · Model Name",
    "modelAdd.step5": "Step 5/5 · Alias (optional)",
    "modelAdd.hintBaseUrl": "The base URL of the API endpoint.",
    "modelAdd.hintApiKey": "The secret key used to authenticate with the provider.",
    "modelAdd.hintApiKeySkip": "Press Enter to skip for local models (e.g. Ollama).",
    "modelAdd.hintModelName": "The exact model ID as required by the API.",
    "modelAdd.hintAlias": "A short name to quickly switch to this model.",
    "modelAdd.promptBaseUrl": "Enter baseUrl:",
    "modelAdd.promptApiKey": "Enter API Key:",
    "modelAdd.promptModelName": "Enter model name:",
    "modelAdd.promptAlias": "Enter alias:",
    "modelAdd.detected": "Detected: {format} (auto-detected from URL)",
    "modelAdd.detectedHint": "You can override if the detection is incorrect.",
    "modelAdd.providerExists": "Provider Already Exists",
    "modelAdd.sameUrlFound": "Same baseUrl found. Choose an option:",
    "modelAdd.yesAddToExisting": "Yes — add model to existing provider",
    "modelAdd.noCreateNew": "No — create new provider with different API key",
    "modelAdd.verifying": "Verifying model config...",
    "modelAdd.verificationFailed": "Verification failed: {error}",
    "modelAdd.whatToDo": "What would you like to do?",
    "modelAdd.saveAnyway": "Save anyway",
    "modelAdd.saveAnywayDesc": "May be a temporary network issue",
    "modelAdd.fixApiKey": "Fix API Key",
    "modelAdd.fixApiKeyDesc": "Re-enter API key only",
    "modelAdd.fixModelName": "Fix Model Name",
    "modelAdd.fixModelNameDesc": "Re-enter model name only",
    "modelAdd.startOver": "Start over",
    "modelAdd.startOverDesc": "Re-enter all fields from beginning",

    "modelAdd.cancel": "Add model cancelled.",
    "modelAdd.examples": "Examples:",
    "modelAdd.exampleDoubaoUrl": "Doubao  : https://ark.cn-beijing.volces.com/api/v3",
    "modelAdd.exampleDeepSeekUrl": "DeepSeek: https://api.deepseek.com/v1",
    "modelAdd.exampleOpenAIUrl": "OpenAI  : https://api.openai.com/v1",
    "modelAdd.exampleLocalUrl": "Local   : http://localhost:11434/v1",
    "modelAdd.exampleDoubaoModel": "Doubao  : doubao-seed-2.0-code",
    "modelAdd.exampleDeepSeekModel": "DeepSeek: deepseek-chat",
    "modelAdd.exampleOpenAIModel": "OpenAI  : gpt-4o",
    "modelAdd.exampleLocalModel": "Local   : qwen3:32b",
    "modelAdd.formatOpenAI": "OpenAI Chat Completions",
    "modelAdd.formatAnthropic": "Anthropic Messages",
    "modelAdd.formatOpenAIDesc": "Standard format used by OpenAI, DeepSeek, Doubao, Ollama, etc.",
    "modelAdd.formatAnthropicDesc": "Native Anthropic format — for proxies that replicate the Messages API",
    "modelAdd.providerLabel": "Provider: \"{name}\"",
    "modelAdd.reusesApiKey": "Reuses existing API key (...{keySuffix})",
    "modelAdd.noApiKey": "No API key set",
    "modelAdd.differentKeyHint": "Use this if you have a different key for the same endpoint",
    "modelAdd.findApiKeyHint": "Find it in your provider's console / dashboard.",
    "modelAdd.aliasExample": "Example: type \"{alias}\" to use instead of the full model ID.",
    "modelAdd.pressEnterSkip": "Press Enter to skip.",
    "modelAdd.modelAddedSuccess": "Model added successfully!",
    "modelAdd.modelLabel": "Model",
    "modelAdd.aliasLabel": "Alias",
    "modelAdd.endpointLabel": "Endpoint",
    "modelAdd.formatLabel": "Format",
    "modelAdd.firstModelHint": "This is your first model — automatically set as default.",
    "modelAdd.nextHint": "Next: /model list to view all  ·  {switchCmd} to switch",
    "modelAdd.addMoreHint": "       /model add to add more models",

    // Plugins
    "plugins.title": "Plugins",
    "plugins.installedTab": "Installed",
    "plugins.marketplacesTab": "Marketplaces",

    // Ultrareview
    "ultrareview.billingTitle": "Ultrareview billing",
    "ultrareview.usageExhausted": "Your free ultrareviews for this organization are used. Further reviews bill as Extra Usage (pay-per-use).",
    "ultrareview.proceedBilling": "Proceed with Extra Usage billing",
    "ultrareview.launching": "Launching…",

    // Fast mode
    "fast.titleOn": "Fast Mode ON",
    "fast.titleOff": "Fast Mode OFF",
    "fast.subtitle": "High-speed mode for {model}. Billed as extra usage at a premium rate. Separate rate limits apply.",
    "fast.turnOn": "Turn on Fast Mode",
    "fast.turnOff": "Turn off Fast Mode",
    "fast.status": "Fast mode {status}",

    // Bypass Permissions Mode Dialog
    "bypass.title": "WARNING: Claude Code running in Bypass Permissions mode",
    "bypass.warning": "In Bypass Permissions mode, Claude Code will not ask for your approval before running potentially dangerous commands.",
    "bypass.restriction": "This mode should only be used in a sandboxed container/VM that has restricted internet access and can easily be restored if damaged.",
    "bypass.responsibility": "By proceeding, you accept all responsibility for actions taken while running in Bypass Permissions mode.",
    "bypass.noExit": "No, exit",
    "bypass.yesAccept": "Yes, I accept",

    // ClaudeMd External Includes Dialog
    "claudeMd.externalImportTitle": "Allow external CLAUDE.md file imports?",
    "claudeMd.externalImportWarning": "This project's CLAUDE.md imports files outside the current working directory. Never allow this for third-party repositories.",
    "claudeMd.externalImportsLabel": "External imports:",
    "claudeMd.securityRisk": "Important: Only use Claude Code with files you trust. Accessing untrusted files may pose security risks",
    "claudeMd.yesAllowExternal": "Yes, allow external imports",
    "claudeMd.noDisableExternal": "No, disable external imports",

    // Worktree Exit Dialog
    "worktree.exitTitle": "Exiting worktree session",
    "worktree.keepBoth": "Keep worktree and tmux session",
    "worktree.keepWorktreeKillTmux": "Keep worktree, kill tmux session",
    "worktree.removeBoth": "Remove worktree and tmux session",
    "worktree.keepingProgress": "Keeping worktree…",
    "worktree.removingProgress": "Removing worktree…",

    // Channel Downgrade Dialog
    "channel.switchToStable": "Switch to Stable Channel",
    "channel.olderVersionWarning": "The stable channel may have an older version than what you're currently running ({version}).",
    "channel.howToHandle": "How would you like to handle this?",
    "channel.allowDowngrade": "Allow possible downgrade to stable version",
    "channel.stayCurrent": "Stay on current version ({version}) until stable catches up",

    // Claude in Chrome Onboarding
    "chromeOnboarding.title": "Claude in Chrome (Beta)",
    "chromeOnboarding.description": "Claude in Chrome works with the Chrome extension to let you control your browser directly from Claude Code. You can navigate websites, fill forms, capture screenshots, record GIFs, and debug with console logs and network requests.",
    "chromeOnboarding.requiresExtension": "Requires the Chrome extension. Get started at",
    "chromeOnboarding.permissionsInfo": "Site-level permissions are inherited from the Chrome extension. Manage permissions in the Chrome extension settings to control which sites Claude can browse, click, and type on.",
    "chromeOnboarding.moreInfo": "For more info, use {command} or visit",

    // Agents
    "agents.noAgentsFound": "No agents found",
    "agents.builtInAgents": "Built-in agents",
    "agents.agentCount": "{count} agents",
    "agents.builtInCannotModify": "Built-in agents are provided by default and cannot be modified.",
    "agents.createNew": "Create new agent",
    "login.apiUsageBilling": "API Usage Billing (Anthropic Console)",
    "login.thirdPartyPlatform": "3rd-party platform",
    "login.customProvider": "Custom provider",
    "login.customProviderDesc": "Configure any API (OpenAI, Anthropic, DeepSeek, Ollama, etc.)",

    // Custom Provider Setup
    "customProvider.step1Title": "Step 1/5 · API Endpoint",
    "customProvider.step1Hint1": "The base URL of the API endpoint.",
    "customProvider.step1Hint2": "Examples:",
    "customProvider.step1HintDoubao": "Doubao  : https://ark.cn-beijing.volces.com/api/v3",
    "customProvider.step1HintDeepSeek": "DeepSeek: https://api.deepseek.com/v1",
    "customProvider.step1HintOpenAI": "OpenAI  : https://api.openai.com/v1",
    "customProvider.step1HintLocal": "Local   : http://localhost:11434/v1",
    "customProvider.step1Prompt": "Enter baseUrl:",
    "customProvider.step1Placeholder": "e.g. https://api.openai.com/v1",

    "customProvider.step2Title": "Step 2/5 · API Format",
    "customProvider.step2Detected": "Detected: {format} (auto-detected from URL)",
    "customProvider.step2Override": "You can override if the detection is incorrect.",
    "customProvider.step2OpenAI": "OpenAI Chat Completions (/v1/chat/completions)",
    "customProvider.step2OpenAIDesc": "Standard format used by OpenAI, DeepSeek, Doubao, Ollama, etc.",
    "customProvider.step2Anthropic": "Anthropic Messages (/v1/messages)",
    "customProvider.step2AnthropicDesc": "Native Anthropic format — for proxies that replicate the Messages API",

    "customProvider.step3Title": "Step 3/5 · API Key",
    "customProvider.step3Hint1": "The secret key used to authenticate with the provider.",
    "customProvider.step3Hint2": "Find it in your provider's console / dashboard.",
    "customProvider.step3Hint3": "Press Enter to skip for local models (e.g. Ollama).",
    "customProvider.step3Prompt": "Enter API Key:",
    "customProvider.step3Placeholder": "e.g. sk-xxxxxxxx",

    "customProvider.step4Title": "Step 4/5 · Model Name",
    "customProvider.step4Hint1": "The exact model ID as required by the API.",
    "customProvider.step4Hint2": "Examples:",
    "customProvider.step4HintDoubao": "Doubao  : doubao-seed-2.0-code",
    "customProvider.step4HintDeepSeek": "DeepSeek: deepseek-chat",
    "customProvider.step4HintOpenAI": "OpenAI  : gpt-4o",
    "customProvider.step4HintLocal": "Local   : qwen3:32b",
    "customProvider.step4Prompt": "Enter model name:",
    "customProvider.step4Placeholder": "gpt-4o",

    "customProvider.step5Title": "Step 5/5 · Alias (optional)",
    "customProvider.step5Hint1": "A short name to quickly switch to this model.",
    "customProvider.step5Hint2": "Example: type \"doubao\" to use instead of the full model ID.",
    "customProvider.step5Hint3": "Press Enter to skip.",
    "customProvider.step5Prompt": "Enter alias:",
    "customProvider.step5Placeholder": "",

    "customProvider.verifying": "Verifying model config...",
    "customProvider.verifyFailed": "Verification failed: {error}",
    "customProvider.verifyFailedHint": "What would you like to do?",
    "customProvider.saveAnyway": "Save anyway",
    "customProvider.saveAnywayDesc": "May be a temporary network issue",
    "customProvider.fixApiKey": "Fix API Key",
    "customProvider.fixApiKeyDesc": "Re-enter API key only",
    "customProvider.fixModelName": "Fix Model Name",
    "customProvider.fixModelNameDesc": "Re-enter model name only",
    "customProvider.startOver": "Start over",
    "customProvider.startOverDesc": "Re-enter all fields from beginning",

    "customProvider.providerExists": "Provider Already Exists",
    "customProvider.providerLabel": "Provider: \"{name}\"",
    "customProvider.sameBaseUrl": "Same baseUrl found. Choose an option:",
    "customProvider.addToExisting": "Yes — add model to existing provider",
    "customProvider.addToExistingDesc": "Reuses existing API key (...{keySuffix})",
    "customProvider.createNew": "No — create new provider with different API key",
    "customProvider.createNewDesc": "Use this if you have a different key for the same endpoint",

    "customProvider.formatOpenAI": "OpenAI Chat Completions",
    "customProvider.formatAnthropic": "Anthropic Messages",
    "customProvider.noApiKey": "No API key set",
    "customProvider.cancel": "Cancel",

    // Effort levels
    "effort.level": "Effort level",
    "effort.auto": "auto",
    "effort.currently": "currently {level}",
    "effort.low": "low",
    "effort.medium": "medium",
    "effort.high": "high",
    "effort.max": "max",
    "effort.lowDesc": "Quick, straightforward implementation with minimal overhead",
    "effort.mediumDesc": "Balanced approach with standard implementation and testing",
    "effort.highDesc": "Comprehensive implementation with extensive testing and documentation",
    "effort.maxDesc": "Maximum capability with deepest reasoning (Opus 4.6 only)",

    "effortCallout.mediumRecommended": "Medium (recommended)",
    "effortCallout.high": "High",
    "effortCallout.low": "Low",

    // Dialogs
    "dialog.exportTitle": "Export Conversation",
    "dialog.exportSubtitle": "Select export method:",
    "dialog.deleteAgent": "Delete agent",
    "dialog.deleteAgentConfirm": "Are you sure you want to delete this agent?",
    "dialog.noAgentsFound": "No agents found",
    "dialog.viewAgent": "View agent",
    "dialog.editAgent": "Edit agent",
    "dialog.switchToStable": "Switch to Stable Channel",
    "dialog.allowDowngrade": "Allow possible downgrade to stable version",
    "dialog.enableAutoMode": "Enable auto mode?",
    "dialog.autoModeDescription": "Auto mode lets Claude Code automatically run tools without asking for confirmation each time. You can still review and approve actions.",
    "dialog.customApiKey": "Detected a custom API key in your environment",
    "dialog.customApiKeyHint": "This allows access to your custom provider.",
    "dialog.allowExternalIncludes": "Allow external CLAUDE.md file imports?",
    "dialog.costThreshold": "Cost Threshold Reached",
    "dialog.gotIt": "Got it, thanks!",
    "dialog.notNow": "Not now",
    "dialog.continueConversation": "Continue this conversation",
    "dialog.newConversation": "Send message as a new conversation",
    "dialog.openInDesktop": "Open in Claude Code Desktop",

    // Diff
    "diff.turn": "Turn {index}",
    "diff.uncommitted": "Uncommitted changes",
    "diff.current": "Current",
    "diff.loading": "Loading diff…",
    "diff.noChangesTurn": "No file changes in this turn",
    "diff.tooManyFiles": "Too many files to display details",
    "diff.cleanTree": "Working tree is clean",
    "diff.dialogDismissed": "Diff dialog dismissed",
    "diff.sourceSelect": "←/→ source",
    "diff.selectFile": "↑/↓ select",
    "diff.viewFile": "Enter view",
    "diff.close": "close",
    "diff.goBack": "← back",

    // Agent
    "agent.runningBackground": "Running in the background",
    "agent.allToolsSelected": "All tools selected",
    "agent.toolsSelected": "{count} of {total} tools selected",
    "agent.currentModel": "Current model (custom ID)",
    "agent.showAdvanced": "Show advanced options",
    "agent.hideAdvanced": "Hide advanced options",
    "agent.chooseColor": "Choose background color",
    "agent.selectTools": "Select tools",
    "agent.agentType": "Agent type (identifier)",
    "agent.descriptionRequired": "Description is required",

    // Tool
    "tool.executionFailed": "Tool execution failed",
    "tool.invalidParams": "Invalid tool parameters",

    // Export
    "export.copyToClipboard": "Copy to clipboard",
    "export.copyToClipboardDesc": "Copy the conversation to your system clipboard",
    "export.saveToFile": "Save to file",
    "export.saveToFileDesc": "Save the conversation to a file in the current directory",
    "export.enterFilename": "Enter filename:",
    "export.copiedToClipboard": "Conversation copied to clipboard",
    "export.exportedTo": "Conversation exported to: {path}",
    "export.failed": "Failed to export conversation: {error}",
    "export.cancelled": "Export cancelled",

    // Idle
    "idle.awayMessage": "You've been away {duration} and this conversation is {tokens} tokens.",
    "idle.newTaskHint": "If this is a new task, clearing context will save usage and be faster.",
    "idle.dontAskAgain": "Don't ask me again",

    // Cost Threshold
    "costThreshold.spent": "You've spent ${amount} on the Anthropic API this session.",
    "costThreshold.learnMore": "Learn more about how to monitor your spending:",

    // Approve API Key
    "approveApiKey.useKey": "Do you want to use this API key?",
    "approveApiKey.yes": "Yes",
    "approveApiKey.no": "No",
    "approveApiKey.recommended": "recommended",

    // Agents menu
    "agents.viewAgent": "View agent",
    "agents.editAgent": "Edit agent",
    "agents.deleteAgent": "Delete agent",
    "agents.deleteConfirm": "Are you sure you want to delete this agent?",
    "agents.back": "Back",
    "agents.continue": "Continue",
    "agents.noAgentsFound": "No agents found",
    "agents.agentsDialogDismissed": "Agents dialog dismissed",
    "agents.editAgentTitle": "Edit agent: {name}",

    // Feedback
    "feedback.continue": "continue",
    "feedback.submit": "submit",
    "feedback.cancel": "cancel",

    // Grove
    "grove.notNow": "Not now",
    "grove.pressAgainToExit": "Press {key} again to exit",
    "grove.toggle": "toggle",

    // Dev Channels
    "devChannels.exit": "Exit",
    "devChannels.title": "WARNING: Loading development channels",
    "devChannels.warning": "--dangerously-load-development-channels is for local channel development only. Do not use this option to run channels you have downloaded off the internet.",
    "devChannels.useChannels": "Please use --channels to run a list of approved channels.",
    "devChannels.channels": "Channels:",
    "devChannels.localDev": "I am using this for local development",

    // Context
    "context.freeSpace": "Free space",

    // Auto Mode
    "autoMode.title": "Enable auto mode?",
    "autoMode.description": "Auto mode lets Claude Code automatically run tools without asking for confirmation each time. You can still review and approve actions.",
    "autoMode.enable": "Yes, enable auto mode",
    "autoMode.stayManual": "No, stay in manual mode",
    "autoMode.yesDefault": "Yes, and make it my default mode",
    "autoMode.noExit": "No, exit",
    "autoMode.noGoBack": "No, go back",

    // Global Search
    "globalSearch.title": "Global Search",
    "globalSearch.placeholder": "Type to search…",
    "globalSearch.searching": "Searching…",
    "globalSearch.noMatches": "No matches",
    "globalSearch.loading": "Loading…",
    "globalSearch.previewUnavailable": "(preview unavailable)",
    "globalSearch.matchesCount": "{count}{truncated} matches",
    "globalSearch.openInEditor": "open in editor",

    // History Search
    "historySearch.title": "Search prompts",
    "historySearch.placeholder": "Filter history…",
    "historySearch.loading": "Loading…",
    "historySearch.noMatching": "No matching prompts",
    "historySearch.noHistory": "No history yet",
    "historySearch.use": "use",
    "historySearch.moreLines": "… +{count} more lines",

    // Agent Wizard
    "agentWizard.typeSubtitle": "Agent type (identifier)",
    "agentWizard.toolsSubtitle": "Select tools",
    "agentWizard.promptSubtitle": "System prompt",
    "agentWizard.modelSubtitle": "Select model",
    "agentWizard.methodSubtitle": "Creation method",
    "agentWizard.memorySubtitle": "Configure agent memory",
    "agentWizard.locationSubtitle": "Choose location",
    "agentWizard.descriptionSubtitle": "Description (tell Claude when to use this agent)",
    "agentWizard.colorSubtitle": "Choose background color",
    "agentWizard.methodGenerate": "Generate with Claude (recommended)",
    "agentWizard.methodManual": "Manual configuration",
    "agentWizard.typeEnterPrompt": "Enter a unique identifier for your agent:",
    "agentWizard.typePlaceholder": "e.g., test-runner, tech-lead, etc",
    "agentWizard.promptEnterPrompt": "Enter the system prompt for your agent:",
    "agentWizard.promptComprehensive": "Be comprehensive for best results",
    "agentWizard.promptPlaceholder": "You are a helpful code reviewer who...",
    "agentWizard.promptRequired": "System prompt is required",
    "agentWizard.descriptionPrompt": "When should Claude use this agent?",
    "agentWizard.descriptionPlaceholder": "e.g., use this agent after you're done writing code...",
    "agentWizard.descriptionRequired": "Description is required",
    "agentWizard.memoryUserRecommended": "User scope (~/.claude/agent-memory/) (Recommended)",
    "agentWizard.memoryNone": "None (no persistent memory)",
    "agentWizard.memoryProject": "Project scope (.claude/agent-memory/)",
    "agentWizard.memoryLocal": "Local scope (.claude/agent-memory-local/)",
    "agentWizard.memoryProjectRecommended": "Project scope (.claude/agent-memory/) (Recommended)",
    "agentWizard.memoryUser": "User scope (~/.claude/agent-memory/)",
    "agentWizard.locationProject": "Project (.claude/agents/)",
    "agentWizard.locationPersonal": "Personal (~/.claude/agents/)",
    "agentWizard.generateSubtitle": "Describe what this agent should do and when it should be used (be comprehensive for best results)",
    "agentWizard.generateCancelled": "Generation cancelled",
    "agentWizard.generatePromptRequired": "Please describe what the agent should do",
    "agentWizard.generateFailed": "Failed to generate agent",
    "agentWizard.generateGenerating": "Generating agent from description...",
    "agentWizard.generatePlaceholder": "e.g., Help me write unit tests for my code...",
    "agentWizard.confirmSubtitle": "Confirm and save",
    "agentWizard.confirmPressSave": "Press {s} or {enter} to save, {e} to save and edit",
    "agentWizard.confirmDescription": "Description (tells Claude when to use this agent):",
    "agentWizard.confirmSystemPrompt": "System prompt:",
    "agentWizard.confirmWarnings": "Warnings:",
    "agentWizard.confirmErrors": "Errors:",
    "agentWizard.confirmAllTools": "All tools",
    "agentWizard.confirmNone": "None",
    "agentWizard.confirmName": "Name",
    "agentWizard.confirmLocation": "Location",
    "agentWizard.confirmTools": "Tools",
    "agentWizard.confirmModel": "Model",
    "agentWizard.confirmMemory": "Memory",

    // Session command
    "session.notInRemoteMode": "Not in remote mode. Start with `claude --remote` to use this command.",
    "session.pressEscClose": "(press esc to close)",
    "session.remoteSession": "Remote session",
    "session.generatingQR": "Generating QR code…",
    "session.openInBrowser": "Open in browser: ",

    // Theme command
    "theme.setTo": "Theme set to {theme}",
    "theme.pickerDismissed": "Theme picker dismissed",
    "theme.title": "Theme",
    "theme.introText": "Let's get started.",
    "theme.chooseStyle": "Choose the text style that looks best with your terminal",
    "theme.autoMatch": "Auto (match terminal)",
    "theme.darkMode": "Dark mode",
    "theme.lightMode": "Light mode",
    "theme.darkColorblind": "Dark mode (colorblind-friendly)",
    "theme.lightColorblind": "Light mode (colorblind-friendly)",
    "theme.darkAnsi": "Dark mode (ANSI colors only)",
    "theme.lightAnsi": "Light mode (ANSI colors only)",
    "theme.syntaxDisabledEnv": "Syntax highlighting disabled (via CLAUDE_CODE_SYNTAX_HIGHLIGHT={value})",
    "theme.syntaxDisabled": "Syntax highlighting disabled ({shortcut} to enable)",
    "theme.syntaxTheme": "Syntax theme: {theme}{source} ({shortcut} to disable)",
    "theme.syntaxEnabled": "Syntax highlighting enabled ({shortcut} to disable)",

    // Common
    "common.yes": "Yes",
    "common.no": "No",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",

    // IDE auto-connect dialog
    "ide.autoConnectTitle": "Do you wish to enable auto-connect to IDE?",
    "ide.autoConnectHint": "You can also configure this in /config or with the --ide flag",
    "ide.disableAutoConnectTitle": "Do you wish to disable auto-connect to IDE?",
    "ide.disableAutoConnectHint": "You can also configure this in /config",

    "ide.enableOption": "Yes",
    "ide.disableOption": "No",

    // MCP server approval dialog
    "mcp.newServerFound": "New MCP server found in .mcp.json: {name}",
    "mcp.useAllFuture": "Use this and all future MCP servers in this project",
    "mcp.useThisServer": "Use this MCP server",
    "mcp.continueWithout": "Continue without using this MCP server",

    // Config error dialog
    "configError.title": "Configuration Error",
    "configError.invalidJson": "The configuration file at {path} contains invalid JSON.",
    "configError.chooseOption": "Choose an option:",
    "configError.exitFixManually": "Exit and fix manually",
    "configError.resetDefault": "Reset with default configuration",

    // Settings error dialog
    "settingsError.title": "Settings Error",
    "settingsError.skipHint": "Files with errors are skipped entirely, not just the invalid settings.",
    "settingsError.exitFixManually": "Exit and fix manually",
    "settingsError.continueWithout": "Continue without these settings",

    // Mobile command
    "mobile.tabToSwitch": "(tab to switch, esc to close)",

    // Agent Detail
    "agentDetail.allTools": "All tools",
    "agentDetail.none": "None",
    "agentDetail.unrecognized": "Unrecognized",
    "agentDetail.description": "Description",
    "agentDetail.descriptionHint": "(tells Claude when to use this agent):",
    "agentDetail.tools": "Tools",
    "agentDetail.model": "Model",
    "agentDetail.permissionMode": "Permission mode",
    "agentDetail.memory": "Memory",
    "agentDetail.hooks": "Hooks",
    "agentDetail.skills": "Skills",
    "agentDetail.skillsCount": "{count} skills",
    "agentDetail.color": "Color",
    "agentDetail.systemPrompt": "System prompt",

    // MCP command
    "mcp.allAlreadyEnabled": "All MCP servers are already enabled",
    "mcp.allAlreadyDisabled": "All MCP servers are already disabled",
    "mcp.serverNotFound": "MCP server \"{name}\" not found",
    "mcp.enabledCount": "Enabled {count} MCP server(s)",
    "mcp.disabledCount": "Disabled {count} MCP server(s)",
    "mcp.serverEnabled": "MCP server \"{name}\" enabled",
    "mcp.serverDisabled": "MCP server \"{name}\" disabled",
    "mcp.newServerFound": "New MCP server found in .mcp.json: {name}",
    "mcp.useAllFuture": "Use this and all future MCP servers in this project",
    "mcp.useThisServer": "Use this MCP server",
    "mcp.continueWithout": "Continue without using this MCP server",

    // Config Error Dialog
    "configError.title": "Configuration Error",
    "configError.invalidJson": "The configuration file at {path} contains invalid JSON.",
    "configError.chooseOption": "Choose an option:",
    "configError.exitFixManually": "Exit and fix manually",
    "configError.resetDefault": "Reset with default configuration",

    // Settings Error Dialog
    "settingsError.title": "Settings Error",
    "settingsError.skipHint": "Files with errors are skipped entirely, not just the invalid settings.",
    "settingsError.continueWithout": "Continue without these settings",

    // Agent Editor
    "agentEditor.openInEditor": "Open in editor",
    "agentEditor.editTools": "Edit tools",
    "agentEditor.editModel": "Edit model",
    "agentEditor.editColor": "Edit color",
    "agentEditor.source": "Source: {source}",
    "agentEditor.openedInEditor": "Opened {name} in editor. If you made edits, restart to load the latest version.",
    "agentEditor.updated": "Updated agent: {name}",
    "agentEditor.saveFailed": "Failed to save agent",

    // Color Picker
    "colorPicker.automatic": "Automatic color",
    "colorPicker.preview": "Preview: ",

    // Model Selector
    "modelSelector.currentModel": "Current model (custom ID)",
    "modelSelector.hint": "Model determines the agent's reasoning capabilities and speed.",

    // Tool Selector
    "toolSelector.hint": "Select tools this agent can use.",
    "toolSelector.allTools": "All tools",
    "toolSelector.allSelected": "All {count} tools selected",
    "toolSelector.selected": "{count}/{total} tools selected",

    // Auto Updater
    "autoUpdater.updating": "Auto-updating…",
    "autoUpdater.updateInstalled": "✓ Update installed · Restart to apply",
    "autoUpdater.updateFailed": "✗ Auto-update failed · Try {command} or {altCommand}",

    // Dialog
    "dialog.pressAgainToExit": "Press {key} again to exit",

    // Trust Dialog
    "trust.accessingWorkspace": "Accessing workspace:",
    "trust.safetyCheck": "Quick safety check: Is this a project you created or one you trust? (Like your own code, a well-known open source project, or work from your team). If not, take a moment to review what's in this folder first.",
    "trust.permissionWarning": "Claude Code'll be able to read, edit, and execute files here.",
    "trust.securityGuide": "Security guide",
    "trust.yesTrust": "Yes, I trust this folder",
    "trust.noExit": "No, exit",
    "trust.pressAgainExit": "Press {key} again to exit",
    "trust.confirmHint": "Enter to confirm · Esc to cancel",
  },

  zh: {
    // Welcome screen
    "welcome.title": "欢迎回来！",
    "welcome.titleWithName": "欢迎回来 {name}！",
    "welcome.recentActivity": "最近活动",
    "welcome.whatsNew": "最新动态",
    "welcome.tipsTitle": "入门提示",
    "welcome.noRecentActivity": "无最近活动",
    "welcome.resumeForMore": "/resume 查看更多",
    "welcome.releaseNotesForMore": "/release-notes 查看更多",

    // Shortcuts
    "shortcuts.hint": "/help 查看快捷键",

    // Config settings
    "config.theme": "界面颜色主题",
    "config.editorMode": "编辑器模式",
    "config.verbose": "显示详细调试输出",
    "config.preferredNotifChannel": "首选通知渠道",
    "config.autoCompactEnabled": "上下文满时自动压缩",
    "config.autoMemoryEnabled": "启用自动记忆",
    "config.autoDreamEnabled": "启用后台记忆整理",
    "config.fileCheckpointingEnabled": "启用文件检查点以支持代码回滚",
    "config.showTurnDuration": "响应后显示耗时消息",
    "config.terminalProgressBarEnabled": "在支持的终端中显示 OSC 9;4 进度指示器",
    "config.todoFeatureEnabled": "启用任务跟踪",
    "config.model": "覆盖默认模型",
    "config.alwaysThinkingEnabled": "启用扩展思考（设为 false 禁用）",
    "config.permissionsDefaultMode": "工具使用的默认权限模式",
    "config.language": "Claude 响应和语音听写的首选语言",
    "config.uiLanguage": "界面显示语言",
    "config.uiLanguage.auto": "自动（检测系统）",
    "config.uiLanguage.en": "英语",
    "config.uiLanguage.zh": "中文",
    "config.teammateMode": "队友生成方式",
    "config.languageSetting": "语言",
    "config.uiLanguageSetting": "界面语言",

    // Settings labels
    "settings.autoCompact": "自动压缩上下文",
    "settings.showTips": "显示提示",
    "settings.reduceMotion": "减少动画",
    "settings.thinkingMode": "思考模式",
    "settings.fastMode": "快速模式（仅 {model}）",
    "settings.promptSuggestions": "提示建议",
    "settings.rewindCode": "代码回滚（检查点）",
    "settings.verboseOutput": "详细输出",
    "settings.terminalProgressBar": "终端进度条",
    "settings.showTurnDuration": "显示耗时",
    "settings.defaultPermissionMode": "默认权限模式",
    "settings.permissionMode.default": "默认",
    "settings.permissionMode.plan": "计划模式",
    "settings.permissionMode.acceptEdits": "接受编辑",
    "settings.permissionMode.bypassPermissions": "绕过权限",
    "settings.useAutoModeDuringPlan": "计划时使用自动模式",
    "settings.respectGitignore": "文件选择器遵循 .gitignore",
    "settings.copyFullResponse": "始终复制完整响应（跳过 /copy 选择器）",
    "settings.copyOnSelect": "选择即复制",
    "settings.autoUpdateChannel": "自动更新通道",
    "settings.disabled": "已禁用",
    "settings.theme": "主题",
    "settings.notifications": "通知",
    "settings.notifChannel.auto": "自动",
    "settings.notifChannel.iterm2": "iTerm2 (OSC 9)",
    "settings.notifChannel.terminal_bell": "终端响铃 (\\a)",
    "settings.notifChannel.kitty": "Kitty (OSC 99)",
    "settings.notifChannel.ghostty": "Ghostty (OSC 777)",
    "settings.notifChannel.iterm2_with_bell": "iTerm2 + 响铃",
    "settings.notifChannel.notifications_disabled": "已禁用",
    "settings.localNotifications": "本地通知",
    "settings.pushWhenIdle": "空闲时推送",
    "settings.pushWhenInputNeeded": "需要输入时推送",
    "settings.pushWhenClaudeDecides": "Claude 决策时推送",
    "settings.outputStyle": "输出样式",
    "settings.defaultView": "默认视图",
    "settings.language": "语言",
    "settings.uiLanguage": "界面语言",
    "settings.editorMode": "编辑器模式",
    "settings.model": "模型",
    "settings.teammateModel": "队友模型",
    "settings.speculationEnabled": "推测执行",
    "settings.showStatusInTerminalTab": "在终端标签页显示状态",
    "settings.showPrStatusFooter": "显示 PR 状态页脚",
    "settings.diffTool": "差异工具",
    "settings.autoConnectIde": "自动连接 IDE（外部终端）",
    "settings.autoInstallIdeExtension": "自动安装 IDE 扩展",
    "settings.claudeInChromeDefaultEnabled": "默认启用 Chrome 中的 Claude",
    "settings.teammateMode": "队友模式",
    "settings.teammateModeOverridden": "队友模式 [已覆盖: {mode}]",
    "settings.defaultTeammateModel": "默认队友模型",
    "settings.remoteControlAtStartup": "为所有会话启用远程控制",
    "settings.externalIncludes": "外部 CLAUDE.md 包含",
    "settings.useCustomApiKey": "使用自定义 API 密钥",
    "settings.searchPlaceholder": "搜索设置…",
    "settings.tab.status": "状态",
    "settings.tab.config": "配置",
    "settings.tab.usage": "使用",
    "settings.defaultRecommended": "默认（推荐）",
    "settings.language.default": "默认（英语）",

    // Status tab
    "status.version": "版本",
    "status.sessionName": "会话名称",
    "status.sessionId": "会话 ID",
    "status.cwd": "工作目录",
    "status.model": "模型",
    "status.renameToAddName": "/rename 添加名称",

    // Command descriptions (shown in help menu and command list)
    "command.description.init": "初始化新的 CLAUDE.md 文件并添加代码库文档",
    "command.description.init-new": "初始化新的 CLAUDE.md 文件及可选的技能/钩子并添加代码库文档",
    "command.description.add-dir": "添加新的工作目录",
    "command.description.agents": "管理代理配置",
    "command.description.branch": "在此处创建当前会话的分支",
    "command.description.btw": "提问快捷问题而不打断主会话",
    "command.description.dream": "手动触发记忆整理",
    "command.description.clear": "清除会话历史并释放上下文",
    "command.description.config": "打开配置面板",
    "command.description.commit": "创建 git 提交",
    "command.description.commit-push-pr": "提交、推送并创建 PR",
    "command.description.context": "以彩色网格可视化当前上下文使用情况",
    "command.description.cost": "显示当前会话的总成本和时长",
    "command.description.desktop": "在 Claude Desktop 中继续当前会话",
    "command.description.diff": "查看未提交的更改和每轮差异",
    "command.description.doctor": "诊断并验证 Claude Code 安装和设置",
    "command.description.exit": "退出 REPL",
    "command.description.export": "将当前会话导出到文件或剪贴板",
    "command.description.files": "列出当前上下文中的所有文件",
    "command.description.help": "显示帮助和可用命令",
    "command.description.ide": "管理 IDE 集成并显示状态",
    "command.description.keybindings": "打开或创建键绑定配置文件",
    "command.description.logout": "退出 Anthropic 账户",
    "command.description.mcp": "管理 MCP 服务器",
    "command.description.memory": "编辑 Claude 记忆文件",
    "command.description.model": "切换或配置模型",
    "command.description.permissions": "管理允许和拒绝工具权限规则",
    "command.description.resume": "恢复之前的会话",
    "command.description.usage": "显示计划使用限制",
    "command.description.vim": "在 Vim 和普通编辑模式之间切换",
    "command.description.voice": "切换语音模式",
    "command.description.brief": "切换简报模式",
    "command.description.hooks": "查看工具事件的钩子配置",
    "command.description.chrome": "Chrome 中的 Claude (Beta) 设置",
    "command.description.effort": "设置模型使用的努力级别",
    "command.description.color": "设置本次会话的提示栏颜色",
    "command.description.mobile": "显示下载 Claude 移动应用的二维码",
    "command.description.bridge": "连接此终端进行远程控制会话",
    "command.description.extra-usage": "配置额外使用以在达到限制时继续工作",
    "command.description.buddy": "孵化编程伙伴",
    "command.description.insights": "生成分析 Claude Code 会话的报告",
    "command.description.install": "安装 Claude Code 原生版本",
    "command.description.install-github-app": "为仓库设置 Claude GitHub Actions",
    "command.description.install-slack-app": "安装 Claude Slack 应用",
    "command.description.heapdump": "将 JS 堆转储到 ~/Desktop",
    "command.description.advisor": "配置顾问模型",

    // Keyboard shortcut action labels
    "shortcut.to": "来",
    "shortcut.action.interrupt": "中断",
    "shortcut.action.stop-agents": "停止代理",
    "shortcut.action.show-tasks": "显示任务",
    "shortcut.action.hide-tasks": "隐藏任务",
    "shortcut.action.show-teammates": "显示队友",
    "shortcut.action.hide": "隐藏",
    "shortcut.action.cancel": "取消",
    "shortcut.action.confirm": "确认",
    "shortcut.action.expand": "展开",
    "shortcut.action.select": "选择",
    "shortcut.action.navigate": "导航",
    "shortcut.action.toggle": "切换",
    "shortcut.action.cycle-modes": "循环模式",
    "shortcut.action.auto-accept-edits": "自动接受编辑",
    "shortcut.action.accept": "接受",
    "shortcut.action.reject": "拒绝",
    "shortcut.action.submit": "提交",
    "shortcut.action.return-team-lead": "返回组长",

    // Change set messages (for handleSaveAndClose)
    "changeSet.setTo": "已将 {key} 设置为 {value}",
    "changeSet.customApiKeyEnabled": "已启用自定义 API 密钥",
    "changeSet.customApiKeyDisabled": "已禁用自定义 API 密钥",
    "changeSet.themeSet": "已将主题设置为 {value}",
    "changeSet.notificationsSet": "已将通知设置为 {value}",
    "changeSet.outputStyleSet": "已将输出样式设置为 {value}",
    "changeSet.languageSet": "已将响应语言设置为 {value}",
    "changeSet.editorModeSet": "已将编辑器模式设置为 {value}",
    "changeSet.diffToolSet": "已将差异工具设置为 {value}",
    "changeSet.autoConnectIdeEnabled": "已启用自动连接 IDE",
    "changeSet.autoConnectIdeDisabled": "已禁用自动连接 IDE",
    "changeSet.autoInstallIdeExtensionEnabled": "已启用自动安装 IDE 扩展",
    "changeSet.autoInstallIdeExtensionDisabled": "已禁用自动安装 IDE 扩展",
    "changeSet.autoCompactEnabled": "已启用自动压缩",
    "changeSet.autoCompactDisabled": "已禁用自动压缩",
    "changeSet.respectGitignoreEnabled": "已启用文件选择器遵循 .gitignore",
    "changeSet.respectGitignoreDisabled": "已禁用文件选择器遵循 .gitignore",
    "changeSet.copyFullResponseEnabled": "已启用始终复制完整响应",
    "changeSet.copyFullResponseDisabled": "已禁用始终复制完整响应",
    "changeSet.copyOnSelectEnabled": "已启用选择即复制",
    "changeSet.copyOnSelectDisabled": "已禁用选择即复制",
    "changeSet.terminalProgressBarEnabled": "已启用终端进度条",
    "changeSet.terminalProgressBarDisabled": "已禁用终端进度条",
    "changeSet.terminalTabStatusEnabled": "已启用终端标签页状态",
    "changeSet.terminalTabStatusDisabled": "已禁用终端标签页状态",
    "changeSet.turnDurationEnabled": "已启用显示耗时",
    "changeSet.turnDurationDisabled": "已禁用显示耗时",
    "changeSet.remoteControlReset": "已重置远程控制为默认",
    "changeSet.remoteControlEnabled": "已为所有会话启用远程控制",
    "changeSet.remoteControlDisabled": "已为所有会话禁用远程控制",
    "changeSet.autoUpdateChannelSet": "已将自动更新通道设置为 {value}",
    "changeSet.configDismissed": "配置对话框已关闭",

    // IDE
    "ide.selectTitle": "选择 IDE",
    "ide.selectSubtitle": "连接 IDE 以获得集成开发功能。",
    "ide.noAvailableIDEs": "未检测到可用的 IDE。请确保您的 IDE 已安装 Claude Code 扩展或插件并正在运行。",
    "ide.noAvailableIDEsJetBrains": "未检测到可用的 IDE。请安装插件并重启 IDE：\nhttps://docs.claude.com/s/claude-code-jetbrains",
    "ide.selectToInstall": "选择 IDE 安装扩展",
    "ide.none": "无",
    "ide.autoConnectTitle": "是否启用自动连接 IDE？",
    "ide.autoConnectHint": "您也可以在 /config 中配置或使用 --ide 参数",
    "ide.disableAutoConnectTitle": "是否禁用自动连接 IDE？",
    "ide.disableAutoConnectHint": "您也可以在 /config 中配置",

    // Chrome
    "chrome.title": "Chrome 中的 Claude (Beta)",
    "chrome.description": "Chrome 中的 Claude 配合 Chrome 扩展程序使用，让您可以直接从 Claude Code 控制浏览器。浏览网站、填写表单、截屏、录制 GIF，以及使用控制台日志和网络请求进行调试。",
    "chrome.installExtension": "安装 Chrome 扩展",
    "chrome.managePermissions": "管理权限",
    "chrome.reconnectExtension": "重新连接扩展",
    "chrome.status": "状态",
    "chrome.extension": "扩展",
    "chrome.enabled": "已启用",
    "chrome.disabled": "已禁用",
    "chrome.installed": "已安装",
    "chrome.notDetected": "未检测到",
    "chrome.enabledByDefault": "默认启用: {status}",
    "chrome.yes": "是",
    "chrome.no": "否",
    "chrome.installHint": "安装完成后，选择\"重新连接扩展\"进行连接。",
    "chrome.permissionsInfo": "网站级权限继承自 Chrome 扩展。在 Chrome 扩展设置中管理权限，以控制 Claude 可以浏览、点击和输入的网站。",
    "chrome.learnMore": "了解更多: https://code.claude.com/docs/en/chrome",
    "chrome.wslNotSupported": "Chrome 中的 Claude 目前不支持 WSL。",
    "chrome.requiresSubscription": "Chrome 中的 Claude 需要 claude.ai 订阅。",
    "chrome.usageHint": "用法: claude --chrome 或 claude --no-chrome",

    // Login
    "login.title": "登录",
    "settings.autoUpdateEnableLatest": "启用最新通道",
    "settings.autoUpdateEnableStable": "启用稳定通道",
    "settings.uiLanguageTitle": "界面语言",
    "settings.uiLanguageDesc": "选择用户界面的显示语言。",
    "settings.uiLanguageDetected": "检测到的系统语言",
    "settings.autoUpdatesEnvControlled": "自动更新由环境变量控制，无法在此更改。",
    "settings.autoUpdatesDisabledDev": "开发版本中禁用了自动更新。",
    "settings.unsetEnvToEnable": "取消设置 {envVar} 以重新启用自动更新。",
    "settings.enableAutoUpdates": "启用自动更新",

    // Common UI
    "common.cancel": "取消",
    "common.confirm": "确认",
    "common.save": "保存",
    "common.loading": "加载中...",
    "common.done": "完成",
    "common.error": "错误",
    "common.success": "成功",
    "common.back": "返回",
    "common.next": "下一步",
    "common.previous": "上一步",
    "common.close": "关闭",
    "common.reset": "重置",
    "common.auto": "自动",
    "common.default": "默认",

    // Errors
    "error.generic": "发生错误",
    "error.notFound": "未找到",
    "error.permissionDenied": "权限被拒绝",
    "error.cancelled": "已取消",

    // Spinner
    "spinner.thinking": "思考中...",
    "spinner.processing": "处理中...",
    "spinner.cookedFor": "耗时 {duration}",
    "spinner.idle": "空闲",
    "spinner.teammatesRunning": "队友运行中",
    "spinner.workedFor": "已工作 {duration}",
    "spinner.idleFor": "空闲 {duration}",
    "spinner.pastTenseFor": "{verb} {duration}",

    // Login
    "login.title": "登录",
    "login.subscriptionPlan": "订阅计划 (Claude Pro/Max)",

    // Memory
    "memory.title": "记忆",

    // Rate limit options
    "rateLimit.title": "您想怎么做？",
    "rateLimit.requestMore": "申请更多",
    "rateLimit.requestExtraUsage": "申请额外用量",
    "rateLimit.addFunds": "充值以继续使用额外用量",
    "rateLimit.switchToExtraUsage": "切换到额外用量",
    "rateLimit.upgradePlan": "升级您的套餐",
    "rateLimit.stopAndWait": "停止并等待限额重置",

    // Remote setup
    "remoteSetup.title": "将 Claude 网页版连接到 GitHub？",
    "remoteSetup.checkingStatus": "正在检查登录状态…",
    "remoteSetup.connectingGitHub": "正在连接 GitHub 到 Claude…",

    // Tag
    "tag.removeTitle": "移除标签？",
    "tag.removeConfirm": "这将从当前会话中移除标签。",
    "tag.yesRemove": "是，移除标签",
    "tag.noKeep": "否，保留标签",

    // Thinkback
    "thinkback.title": "用 Claude Code 回顾 2025",
    "thinkback.subtitle": "生成您的 2025 Claude Code 回顾（需要几分钟）",
    "thinkback.generateAnimation": "生成您的个性化动画",

    // Model Add
    "modelAdd.step1": "第 1/5 步 · API 端点",
    "modelAdd.step2": "第 2/5 步 · API 格式",
    "modelAdd.step3": "第 3/5 步 · API 密钥",
    "modelAdd.step4": "第 4/5 步 · 模型名称",
    "modelAdd.step5": "第 5/5 步 · 别名（可选）",
    "modelAdd.hintBaseUrl": "API 端点的基础 URL。",
    "modelAdd.hintApiKey": "用于验证身份的密钥。",
    "modelAdd.hintApiKeySkip": "按 Enter 跳过本地模型（如 Ollama）。",
    "modelAdd.hintModelName": "API 要求的精确模型 ID。",
    "modelAdd.hintAlias": "快速切换到此模型的简短名称。",
    "modelAdd.promptBaseUrl": "输入 baseUrl:",
    "modelAdd.promptApiKey": "输入 API 密钥:",
    "modelAdd.promptModelName": "输入模型名称:",
    "modelAdd.promptAlias": "输入别名:",
    "modelAdd.detected": "检测到: {format}（从 URL 自动检测）",
    "modelAdd.detectedHint": "如果检测不正确，您可以覆盖。",
    "modelAdd.providerExists": "提供商已存在",
    "modelAdd.sameUrlFound": "发现相同的 baseUrl。请选择一个选项：",
    "modelAdd.yesAddToExisting": "是 — 将模型添加到现有提供商",
    "modelAdd.noCreateNew": "否 — 使用不同的 API 密钥创建新提供商",
    "modelAdd.verifying": "正在验证模型配置...",
    "modelAdd.verificationFailed": "验证失败: {error}",
    "modelAdd.whatToDo": "您想怎么做？",
    "modelAdd.saveAnyway": "仍然保存",
    "modelAdd.saveAnywayDesc": "可能是临时网络问题",
    "modelAdd.fixApiKey": "修复 API 密钥",
    "modelAdd.fixApiKeyDesc": "仅重新输入 API 密钥",
    "modelAdd.fixModelName": "修复模型名称",
    "modelAdd.fixModelNameDesc": "仅重新输入模型名称",
    "modelAdd.startOver": "重新开始",
    "modelAdd.startOverDesc": "从头重新输入所有字段",

    "modelAdd.cancel": "添加模型已取消。",
    "modelAdd.examples": "示例：",
    "modelAdd.exampleDoubaoUrl": "Doubao  : https://ark.cn-beijing.volces.com/api/v3",
    "modelAdd.exampleDeepSeekUrl": "DeepSeek: https://api.deepseek.com/v1",
    "modelAdd.exampleOpenAIUrl": "OpenAI  : https://api.openai.com/v1",
    "modelAdd.exampleLocalUrl": "Local   : http://localhost:11434/v1",
    "modelAdd.exampleDoubaoModel": "Doubao  : doubao-seed-2.0-code",
    "modelAdd.exampleDeepSeekModel": "DeepSeek: deepseek-chat",
    "modelAdd.exampleOpenAIModel": "OpenAI  : gpt-4o",
    "modelAdd.exampleLocalModel": "Local   : qwen3:32b",
    "modelAdd.formatOpenAI": "OpenAI Chat Completions",
    "modelAdd.formatAnthropic": "Anthropic Messages",
    "modelAdd.formatOpenAIDesc": "OpenAI、DeepSeek、Doubao、Ollama 等使用的标准格式。",
    "modelAdd.formatAnthropicDesc": "原生 Anthropic 格式 — 用于复制 Messages API 的代理。",
    "modelAdd.providerLabel": "提供商：\"{name}\"",
    "modelAdd.reusesApiKey": "复用现有 API 密钥 (...{keySuffix})",
    "modelAdd.noApiKey": "未设置 API 密钥",
    "modelAdd.differentKeyHint": "如果您有同一端点的不同密钥，请使用此项",
    "modelAdd.findApiKeyHint": "在您的提供商控制台/仪表板中找到它。",
    "modelAdd.aliasExample": "示例：输入 \"{alias}\" 代替完整模型 ID。",
    "modelAdd.pressEnterSkip": "按 Enter 跳过。",
    "modelAdd.modelAddedSuccess": "模型添加成功！",
    "modelAdd.modelLabel": "模型",
    "modelAdd.aliasLabel": "别名",
    "modelAdd.endpointLabel": "端点",
    "modelAdd.formatLabel": "格式",
    "modelAdd.firstModelHint": "这是您的第一个模型 — 自动设置为默认。",
    "modelAdd.nextHint": "下一步：/model list 查看所有模型  ·  {switchCmd} 切换",
    "modelAdd.addMoreHint": "       /model add 添加更多模型",

    // Plugins
    "plugins.title": "插件",
    "plugins.installedTab": "已安装",
    "plugins.marketplacesTab": "市场",

    // Ultrareview
    "ultrareview.billingTitle": "Ultrareview 计费",
    "ultrareview.usageExhausted": "您的组织免费 ultrareviews 已用完。后续审核将按额外用量计费（按使用付费）。",
    "ultrareview.proceedBilling": "继续使用额外用量计费",
    "ultrareview.launching": "正在启动…",

    // Fast mode
    "fast.titleOn": "快速模式已开启",
    "fast.titleOff": "快速模式已关闭",
    "fast.subtitle": "{model} 的高速模式。按额外用量计费，费率较高。适用单独的限额。",
    "fast.turnOn": "开启快速模式",
    "fast.turnOff": "关闭快速模式",
    "fast.status": "快速模式 {status}",

    // Bypass Permissions Mode Dialog
    "bypass.title": "警告：Claude Code 正在绕过权限模式下运行",
    "bypass.warning": "在绕过权限模式下，Claude Code 不会在运行潜在危险命令前请求您的批准。",
    "bypass.restriction": "此模式仅应在具有受限互联网访问且易于恢复的沙盒容器/虚拟机中使用。",
    "bypass.responsibility": "继续即表示您接受在绕过权限模式下执行操作的所有责任。",
    "bypass.noExit": "否，退出",
    "bypass.yesAccept": "是，我接受",

    // ClaudeMd External Includes Dialog
    "claudeMd.externalImportTitle": "允许外部 CLAUDE.md 文件导入？",
    "claudeMd.externalImportWarning": "此项目的 CLAUDE.md 导入了当前工作目录之外的文件。切勿对第三方仓库允许此操作。",
    "claudeMd.externalImportsLabel": "外部导入：",
    "claudeMd.securityRisk": "重要提示：仅对您信任的文件使用 Claude Code。访问不受信任的文件可能存在安全风险",
    "claudeMd.yesAllowExternal": "是，允许外部导入",
    "claudeMd.noDisableExternal": "否，禁用外部导入",

    // Worktree Exit Dialog
    "worktree.exitTitle": "正在退出工作树会话",
    "worktree.keepBoth": "保留工作树和 tmux 会话",
    "worktree.keepWorktreeKillTmux": "保留工作树，关闭 tmux 会话",
    "worktree.removeBoth": "删除工作树和 tmux 会话",
    "worktree.keepingProgress": "正在保留工作树…",
    "worktree.removingProgress": "正在删除工作树…",

    // Channel Downgrade Dialog
    "channel.switchToStable": "切换到稳定通道",
    "channel.olderVersionWarning": "稳定通道可能比您当前运行的版本 ({version}) 更旧。",
    "channel.howToHandle": "您想如何处理？",
    "channel.allowDowngrade": "允许降级到稳定版本",
    "channel.stayCurrent": "保持当前版本 ({version}) 直到稳定通道追赶上来",

    // Claude in Chrome Onboarding
    "chromeOnboarding.title": "Chrome 中的 Claude (Beta)",
    "chromeOnboarding.description": "Chrome 中的 Claude 配合 Chrome 扩展程序使用，让您可以直接从 Claude Code 控制浏览器。您可以浏览网站、填写表单、截屏、录制 GIF，以及使用控制台日志和网络请求进行调试。",
    "chromeOnboarding.requiresExtension": "需要 Chrome 扩展程序。从这里开始：",
    "chromeOnboarding.permissionsInfo": "网站级权限继承自 Chrome 扩展。在 Chrome 扩展设置中管理权限，以控制 Claude 可以浏览、点击和输入的网站。",
    "chromeOnboarding.moreInfo": "更多信息，请使用 {command} 或访问",

    // Agents
    "agents.noAgentsFound": "未找到代理",
    "agents.builtInAgents": "内置代理",
    "agents.agentCount": "{count} 个代理",
    "agents.builtInCannotModify": "内置代理是默认提供的，无法修改。",
    "agents.createNew": "Create new agent",

    // Help
    "help.title": "Help",
    "help.tabGeneral": "general",
    "help.tabCommands": "commands",
    "help.tabCustomCommands": "custom-commands",
    "help.tabKeybindings": "keybindings",
    "help.browseCommands": "Browse default commands:",
    "help.browseCustomCommands": "Browse custom commands:",
    "help.browseKeybindings": "Browse keybindings:",
    "help.noCommands": "No commands found",
    "help.noKeybindings": "No custom keybindings",
    "help.dialogDismissed": "帮助对话框已关闭",

    // Permissions (Chinese)
    "permissions.toolUse": "工具使用",
    "permissions.yes": "是",
    "permissions.no": "否",
    "permissions.yesAlways": "是，总是",
    "permissions.noAlways": "否，总是",
    "permissions.allow": "允许",
    "permissions.deny": "拒绝",
    "permissions.allowOnce": "允许一次",
    "permissions.denyOnce": "拒绝一次",
    "permissions.allowAll": "全部允许",
    "permissions.denyAll": "全部拒绝",
    "permissions.editFile": "编辑文件",
    "permissions.runCommand": "运行命令",
    "permissions.command": "命令：",
    "permissions.file": "文件：",
    "permissions.directory": "目录：",

    // Shell permissions (Chinese)
    "shell.yesAllowAccess": "是，并始终允许访问 {path}",
    "shell.yesAllowAccessMultiple": "是，并始终允许从此项目访问 {paths}",
    "shell.yesAllowRead": "是，允许从此项目读取 {paths}",
    "shell.yesAllowCommand": "是，并始终允许在此项目中运行 {command}",
    "shell.yesAllowCommands": "是，并始终允许在此项目中运行这些命令",

    // MCP (Chinese)
    "mcp.manageServers": "管理 MCP 服务器",
    "mcp.dialogDismissed": "MCP 对话框已关闭",
    "mcp.serverRequestsInput": "MCP 服务器 \"{server}\" 请求您的输入",
    "mcp.tools": "工具",
    "mcp.resources": "资源",
    "mcp.prompts": "提示",
    "mcp.noServers": "未配置 MCP 服务器",
    "mcp.noTools": "无可用工具",
    "mcp.noResources": "无可用资源",
    "mcp.noPrompts": "无可用提示",
    "mcp.back": "返回",
    "mcp.connecting": "连接中...",
    "mcp.connected": "已连接",
    "mcp.disconnected": "已断开",
    "mcp.error": "错误",

    // MCP Elicitation (Chinese)
    "mcp.requestsInput": "MCP 服务器 \"{server}\" 请求您的输入",
    "mcp.waitingCompletion": "MCP 服务器 \"{server}\" — 等待完成",
    "mcp.wantsOpenUrl": "MCP 服务器 \"{server}\" 想要打开 URL",
    "mcp.pressAgainExit": "再次按 {key} 退出",
    "mcp.allow": "允许",
    "mcp.deny": "拒绝",
    "mcp.cancel": "取消",
    "mcp.submit": "提交",
    "mcp.openUrl": "打开 URL",

    // Tasks
    "tasks.backgroundTasks": "Background tasks",
    "tasks.noActiveTasks": "No active background tasks",
    "tasks.noCompletedTasks": "No completed tasks",
    "tasks.running": "Running",
    "tasks.completed": "Completed",
    "tasks.failed": "Failed",
    "tasks.cancelled": "Cancelled",
    "tasks.pending": "Pending",
    "tasks.details": "Details",
    "tasks.cancel": "Cancel",
    "tasks.retry": "Retry",
    "tasks.dismiss": "Dismiss",
    "tasks.dismissAll": "Dismiss all",
    "tasks.clear": "Clear completed",
    "tasks.back": "Back",

    // Common
    "common.cancel": "Cancel",
    "common.continue": "Continue",
    "common.yes": "Yes",
    "common.no": "No",
    "common.ok": "OK",
    "common.confirm": "Confirm",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.loading": "Loading...",
    "common.done": "Done",
    "common.error": "Error",
    "common.success": "Success",

    // Welcome
    "welcome.message": "Welcome to Claude Code",
    "welcome.getStarted": "Get started by typing a message below",
    "welcome.typeHelp": "Type /help for available commands",

    // Global Search (Chinese)
    "globalSearch.title": "全局搜索",
    "globalSearch.placeholder": "输入以搜索…",
    "globalSearch.searching": "搜索中…",
    "globalSearch.noMatches": "无匹配结果",
    "globalSearch.loading": "加载中…",
    "globalSearch.previewUnavailable": "(预览不可用)",
    "globalSearch.matchesCount": "{count}{truncated} 个匹配",
    "globalSearch.openInEditor": "在编辑器中打开",

    // History Search (Chinese)
    "historySearch.title": "搜索历史提示",
    "historySearch.placeholder": "筛选历史…",
    "historySearch.loading": "加载中…",
    "historySearch.noMatching": "无匹配的提示",
    "historySearch.noHistory": "暂无历史",
    "historySearch.use": "使用",
    "historySearch.moreLines": "… 还有 {count} 行",

    // Agent Wizard (Chinese)
    "agentWizard.typeSubtitle": "代理类型（标识符）",
    "agentWizard.toolsSubtitle": "选择工具",
    "agentWizard.promptSubtitle": "系统提示",
    "agentWizard.modelSubtitle": "选择模型",
    "agentWizard.methodSubtitle": "创建方式",
    "agentWizard.memorySubtitle": "配置代理记忆",
    "agentWizard.locationSubtitle": "选择位置",
    "agentWizard.descriptionSubtitle": "描述（告诉 Claude 何时使用此代理）",
    "agentWizard.colorSubtitle": "选择背景颜色",
    "agentWizard.methodGenerate": "由 Claude 生成（推荐）",
    "agentWizard.methodManual": "手动配置",
    "agentWizard.typeEnterPrompt": "为您的代理输入唯一标识符：",
    "agentWizard.typePlaceholder": "例如：test-runner, tech-lead 等",
    "agentWizard.promptEnterPrompt": "输入代理的系统提示：",
    "agentWizard.promptComprehensive": "详细描述以获得最佳效果",
    "agentWizard.promptPlaceholder": "你是一个有帮助的代码审查员，...",
    "agentWizard.promptRequired": "系统提示为必填项",
    "agentWizard.descriptionPrompt": "Claude 应该何时使用此代理？",
    "agentWizard.descriptionPlaceholder": "例如，在你完成代码编写后使用此代理...",
    "agentWizard.descriptionRequired": "描述为必填项",
    "agentWizard.memoryUserRecommended": "用户范围（~/.claude/agent-memory/）（推荐）",
    "agentWizard.memoryNone": "无（无持久记忆）",
    "agentWizard.memoryProject": "项目范围（.claude/agent-memory/）",
    "agentWizard.memoryLocal": "本地范围（.claude/agent-memory-local/）",
    "agentWizard.memoryProjectRecommended": "项目范围（.claude/agent-memory/）（推荐）",
    "agentWizard.memoryUser": "用户范围（~/.claude/agent-memory/）",
    "agentWizard.locationProject": "项目（.claude/agents/）",
    "agentWizard.locationPersonal": "个人（~/.claude/agents/）",
    "agentWizard.generateSubtitle": "描述此代理应该做什么以及何时使用（详细描述以获得最佳效果）",
    "agentWizard.generateCancelled": "生成已取消",
    "agentWizard.generatePromptRequired": "请描述代理应该做什么",
    "agentWizard.generateFailed": "生成代理失败",
    "agentWizard.generateGenerating": "正在根据描述生成代理...",
    "agentWizard.generatePlaceholder": "例如，帮我为代码编写单元测试...",
    "agentWizard.confirmSubtitle": "确认并保存",
    "agentWizard.confirmPressSave": "按 {s} 或 {enter} 保存，{e} 保存并编辑",
    "agentWizard.confirmDescription": "描述（告诉 Claude 何时使用此代理）：",
    "agentWizard.confirmSystemPrompt": "系统提示：",
    "agentWizard.confirmWarnings": "警告：",
    "agentWizard.confirmErrors": "错误：",
    "agentWizard.confirmAllTools": "所有工具",
    "agentWizard.confirmNone": "无",
    "agentWizard.confirmName": "名称",
    "agentWizard.confirmLocation": "位置",
    "agentWizard.confirmTools": "工具",
    "agentWizard.confirmModel": "模型",
    "agentWizard.confirmMemory": "记忆",

    // Session command (Chinese)
    "session.notInRemoteMode": "不在远程模式下。请使用 `claude --remote` 启动来使用此命令。",
    "session.pressEscClose": "(按 esc 关闭)",
    "session.remoteSession": "远程会话",
    "session.generatingQR": "正在生成二维码…",
    "session.openInBrowser": "在浏览器中打开：",

    // Theme command (Chinese)
    "theme.setTo": "主题已设置为 {theme}",
    "theme.pickerDismissed": "主题选择器已关闭",
    "theme.title": "主题",
    "theme.introText": "让我们开始吧。",
    "theme.chooseStyle": "选择最适合您终端的文字样式",
    "theme.autoMatch": "自动（匹配终端）",
    "theme.darkMode": "深色模式",
    "theme.lightMode": "浅色模式",
    "theme.darkColorblind": "深色模式（色盲友好）",
    "theme.lightColorblind": "浅色模式（色盲友好）",
    "theme.darkAnsi": "深色模式（仅 ANSI 颜色）",
    "theme.lightAnsi": "浅色模式（仅 ANSI 颜色）",
    "theme.syntaxDisabledEnv": "语法高亮已禁用（通过 CLAUDE_CODE_SYNTAX_HIGHLIGHT={value}）",
    "theme.syntaxDisabled": "语法高亮已禁用（{shortcut} 启用）",
    "theme.syntaxTheme": "语法主题：{theme}{source}（{shortcut} 禁用）",
    "theme.syntaxEnabled": "语法高亮已启用（{shortcut} 禁用）",

    // Common (Chinese)
    "common.yes": "是",
    "common.no": "否",
    "common.cancel": "取消",
    "common.confirm": "确认",

    // IDE auto-connect dialog (Chinese)
    "ide.autoConnectTitle": "是否启用 IDE 自动连接？",
    "ide.autoConnectHint": "您也可以在 /config 中配置或使用 --ide 标志",
    "ide.disableAutoConnectTitle": "是否禁用 IDE 自动连接？",
    "ide.disableAutoConnectHint": "您也可以在 /config 中配置",
    "ide.enableOption": "是",
    "ide.disableOption": "否",

    // MCP server approval dialog (Chinese)
    "mcp.newServerFound": "在 .mcp.json 中发现新的 MCP 服务器：{name}",
    "mcp.useAllFuture": "使用此服务器及此项目中的所有未来 MCP 服务器",
    "mcp.useThisServer": "使用此 MCP 服务器",
    "mcp.continueWithout": "不使用此 MCP 服务器继续",

    // Config error dialog (Chinese)
    "configError.title": "配置错误",
    "configError.invalidJson": "{path} 处的配置文件包含无效的 JSON。",
    "configError.chooseOption": "选择一个选项：",
    "configError.exitFixManually": "退出并手动修复",
    "configError.resetDefault": "使用默认配置重置",

    // Settings error dialog (Chinese)
    "settingsError.title": "设置错误",
    "settingsError.skipHint": "有错误的文件将被完全跳过，而不仅仅是无效的设置。",
    "settingsError.exitFixManually": "退出并手动修复",
    "settingsError.continueWithout": "不使用这些设置继续",

    // Mobile command (Chinese)
    "mobile.tabToSwitch": "(Tab 切换，Esc 关闭)",

    // Agent Detail (Chinese)
    "agentDetail.allTools": "所有工具",
    "agentDetail.none": "无",
    "agentDetail.unrecognized": "无法识别",
    "agentDetail.description": "描述",
    "agentDetail.descriptionHint": "（告诉 Claude 何时使用此代理）：",
    "agentDetail.tools": "工具",
    "agentDetail.model": "模型",
    "agentDetail.permissionMode": "权限模式",
    "agentDetail.memory": "记忆",
    "agentDetail.hooks": "钩子",
    "agentDetail.skills": "技能",
    "agentDetail.skillsCount": "{count} 个技能",
    "agentDetail.color": "颜色",
    "agentDetail.systemPrompt": "系统提示",

    // MCP command (Chinese)
    "mcp.allAlreadyEnabled": "所有 MCP 服务器已启用",
    "mcp.allAlreadyDisabled": "所有 MCP 服务器已禁用",
    "mcp.serverNotFound": "未找到 MCP 服务器 \"{name}\"",
    "mcp.enabledCount": "已启用 {count} 个 MCP 服务器",
    "mcp.disabledCount": "已禁用 {count} 个 MCP 服务器",
    "mcp.serverEnabled": "MCP 服务器 \"{name}\" 已启用",
    "mcp.serverDisabled": "MCP 服务器 \"{name}\" 已禁用",
    "mcp.newServerFound": "在 .mcp.json 中发现新 MCP 服务器：{name}",
    "mcp.useAllFuture": "使用此项目中的此服务器及所有未来 MCP 服务器",
    "mcp.useThisServer": "使用此 MCP 服务器",
    "mcp.continueWithout": "继续但不使用此 MCP 服务器",

    // Config Error Dialog (Chinese)
    "configError.title": "配置错误",
    "configError.invalidJson": "配置文件 {path} 包含无效的 JSON。",
    "configError.chooseOption": "选择一个选项：",
    "configError.exitFixManually": "退出并手动修复",
    "configError.resetDefault": "重置为默认配置",

    // Settings Error Dialog (Chinese)
    "settingsError.title": "设置错误",
    "settingsError.skipHint": "有错误的文件将被完全跳过，而不仅仅是无效的设置。",
    "settingsError.continueWithout": "继续但不使用这些设置",
    "mcp.enabledCount": "已启用 {count} 个 MCP 服务器",
    "mcp.disabledCount": "已禁用 {count} 个 MCP 服务器",
    "mcp.serverEnabled": "MCP 服务器 \"{name}\" 已启用",
    "mcp.serverDisabled": "MCP 服务器 \"{name}\" 已禁用",

    // Agent Editor (Chinese)
    "agentEditor.openInEditor": "在编辑器中打开",
    "agentEditor.editTools": "编辑工具",
    "agentEditor.editModel": "编辑模型",
    "agentEditor.editColor": "编辑颜色",
    "agentEditor.source": "来源：{source}",
    "agentEditor.openedInEditor": "已在编辑器中打开 {name}。如果进行了编辑，请重启以加载最新版本。",
    "agentEditor.updated": "已更新代理：{name}",
    "agentEditor.saveFailed": "保存代理失败",

    // Color Picker (Chinese)
    "colorPicker.automatic": "自动颜色",
    "colorPicker.preview": "预览：",

    // Model Selector (Chinese)
    "modelSelector.currentModel": "当前模型（自定义 ID）",
    "modelSelector.hint": "模型决定代理的推理能力和速度。",

    // Tool Selector (Chinese)
    "toolSelector.hint": "选择此代理可以使用的工具。",
    "toolSelector.allTools": "所有工具",
    "toolSelector.allSelected": "已选择全部 {count} 个工具",
    "toolSelector.selected": "已选择 {count}/{total} 个工具",

    // Auto Updater (Chinese)
    "autoUpdater.updating": "正在自动更新…",
    "autoUpdater.updateInstalled": "✓ 更新已安装 · 重启以应用",
    "autoUpdater.updateFailed": "✗ 自动更新失败 · 尝试 {command} 或 {altCommand}",

    // Dialog (Chinese)
    "dialog.pressAgainToExit": "再按 {key} 退出",

    // Trust Dialog (Chinese)
    "trust.accessingWorkspace": "正在访问工作区：",
    "trust.safetyCheck": "快速安全检查：这是您创建或信任的项目吗？（比如您自己的代码、知名开源项目或团队作品）。如果不是，请先花点时间查看此文件夹的内容。",
    "trust.permissionWarning": "Claude Code 将能够在此读取、编辑和执行文件。",
    "trust.securityGuide": "安全指南",
    "trust.yesTrust": "是，我信任此文件夹",
    "trust.noExit": "否，退出",
    "trust.pressAgainExit": "再按 {key} 退出",
    "trust.confirmHint": "Enter 确认 · Esc 取消",

    // Agents (Chinese)
    "agents.noAgentsFound": "未找到代理",
    "agents.builtInAgents": "内置代理",
    "agents.agentCount": "{count} 个代理",
    "agents.builtInCannotModify": "内置代理是默认提供的，无法修改。",
    "agents.createNew": "创建新代理",

    // Help (Chinese)
    "help.title": "帮助",
    "help.tabGeneral": "常规",
    "help.tabCommands": "命令",
    "help.tabCustomCommands": "自定义命令",
    "help.tabKeybindings": "快捷键",
    "help.browseCommands": "浏览默认命令：",
    "help.browseCustomCommands": "浏览自定义命令：",
    "help.browseKeybindings": "浏览快捷键：",
    "help.noCommands": "未找到命令",
    "help.noKeybindings": "无自定义快捷键",
    "help.dialogDismissed": "帮助对话框已关闭",

    // Permissions
    "permissions.toolUse": "Tool use",
    "permissions.yes": "Yes",
    "permissions.no": "No",
    "permissions.yesAlways": "Yes, always",
    "permissions.noAlways": "No, always",
    "permissions.allow": "Allow",
    "permissions.deny": "Deny",
    "permissions.allowOnce": "Allow once",
    "permissions.denyOnce": "Deny once",
    "permissions.allowAll": "Allow all",
    "permissions.denyAll": "Deny all",
    "permissions.editFile": "Edit file",
    "permissions.runCommand": "Run command",
    "permissions.command": "Command:",
    "permissions.file": "File:",
    "permissions.directory": "Directory:",

    // Shell permissions
    "shell.yesAllowAccess": "Yes, and always allow access to {path}",
    "shell.yesAllowAccessMultiple": "Yes, and always allow access to {paths} from this project",
    "shell.yesAllowRead": "Yes, allow reading from {paths} from this project",
    "shell.yesAllowCommand": "Yes, and always allow {command} in this project",
    "shell.yesAllowCommands": "Yes, and always allow these commands in this project",

    // MCP
    "mcp.manageServers": "Manage MCP servers",
    "mcp.dialogDismissed": "MCP dialog dismissed",
    "mcp.serverRequestsInput": "MCP server \"{server}\" requests your input",
    "mcp.tools": "Tools",
    "mcp.resources": "Resources",
    "mcp.prompts": "Prompts",
    "mcp.noServers": "No MCP servers configured",
    "mcp.noTools": "No tools available",
    "mcp.noResources": "No resources available",
    "mcp.noPrompts": "No prompts available",
    "mcp.back": "Back",
    "mcp.connecting": "Connecting...",
    "mcp.connected": "Connected",
    "mcp.disconnected": "Disconnected",
    "mcp.error": "Error",

    // MCP Elicitation
    "mcp.requestsInput": "MCP server \"{server}\" requests your input",
    "mcp.waitingCompletion": "MCP server \"{server}\" — waiting for completion",
    "mcp.wantsOpenUrl": "MCP server \"{server}\" wants to open a URL",
    "mcp.pressAgainExit": "Press {key} again to exit",
    "mcp.allow": "Allow",
    "mcp.deny": "Deny",
    "mcp.cancel": "Cancel",
    "mcp.submit": "Submit",
    "mcp.openUrl": "打开 URL",

    // Tasks (Chinese)
    "tasks.backgroundTasks": "后台任务",
    "tasks.noActiveTasks": "无活动的后台任务",
    "tasks.noCompletedTasks": "无已完成的任务",
    "tasks.running": "运行中",
    "tasks.completed": "已完成",
    "tasks.failed": "失败",
    "tasks.cancelled": "已取消",
    "tasks.pending": "待处理",
    "tasks.details": "详情",
    "tasks.cancel": "取消",
    "tasks.retry": "重试",
    "tasks.dismiss": "关闭",
    "tasks.dismissAll": "关闭全部",
    "tasks.clear": "清除已完成",
    "tasks.back": "返回",

    // Common (Chinese)
    "common.cancel": "取消",
    "common.continue": "继续",
    "common.yes": "是",
    "common.no": "否",
    "common.ok": "确定",
    "common.confirm": "确认",
    "common.save": "保存",
    "common.delete": "删除",
    "common.back": "返回",
    "common.next": "下一步",
    "common.previous": "上一步",
    "common.loading": "加载中...",
    "common.done": "完成",
    "common.error": "错误",
    "common.success": "成功",
    "login.apiUsageBilling": "API 用量计费 (Anthropic Console)",
    "login.thirdPartyPlatform": "第三方平台",
    "login.customProvider": "自定义提供商",
    "login.customProviderDesc": "配置任意 API (OpenAI, Anthropic, DeepSeek, Ollama 等)",

    // Custom Provider Setup
    "customProvider.step1Title": "第 1/5 步 · API 端点",
    "customProvider.step1Hint1": "API 端点的基 URL。",
    "customProvider.step1Hint2": "示例：",
    "customProvider.step1HintDoubao": "豆包    : https://ark.cn-beijing.volces.com/api/v3",
    "customProvider.step1HintDeepSeek": "DeepSeek: https://api.deepseek.com/v1",
    "customProvider.step1HintOpenAI": "OpenAI  : https://api.openai.com/v1",
    "customProvider.step1HintLocal": "本地    : http://localhost:11434/v1",
    "customProvider.step1Prompt": "输入 baseUrl：",
    "customProvider.step1Placeholder": "例如 https://api.openai.com/v1",

    "customProvider.step2Title": "第 2/5 步 · API 格式",
    "customProvider.step2Detected": "检测到：{format}（从 URL 自动检测）",
    "customProvider.step2Override": "如果检测不正确，可以手动覆盖。",
    "customProvider.step2OpenAI": "OpenAI Chat Completions (/v1/chat/completions)",
    "customProvider.step2OpenAIDesc": "OpenAI、DeepSeek、豆包、Ollama 等使用的标准格式",
    "customProvider.step2Anthropic": "Anthropic Messages (/v1/messages)",
    "customProvider.step2AnthropicDesc": "原生 Anthropic 格式 — 用于复制 Messages API 的代理",

    "customProvider.step3Title": "第 3/5 步 · API 密钥",
    "customProvider.step3Hint1": "用于提供商认证的密钥。",
    "customProvider.step3Hint2": "在提供商的控制台/仪表板中查找。",
    "customProvider.step3Hint3": "本地模型（如 Ollama）按 Enter 跳过。",
    "customProvider.step3Prompt": "输入 API 密钥：",
    "customProvider.step3Placeholder": "例如 sk-xxxxxxxx",

    "customProvider.step4Title": "第 4/5 步 · 模型名称",
    "customProvider.step4Hint1": "API 要求的精确模型 ID。",
    "customProvider.step4Hint2": "示例：",
    "customProvider.step4HintDoubao": "豆包    : doubao-seed-2.0-code",
    "customProvider.step4HintDeepSeek": "DeepSeek: deepseek-chat",
    "customProvider.step4HintOpenAI": "OpenAI  : gpt-4o",
    "customProvider.step4HintLocal": "本地    : qwen3:32b",
    "customProvider.step4Prompt": "输入模型名称：",
    "customProvider.step4Placeholder": "gpt-4o",

    "customProvider.step5Title": "第 5/5 步 · 别名（可选）",
    "customProvider.step5Hint1": "快速切换到此模型的短名称。",
    "customProvider.step5Hint2": "例如：输入 \"doubao\" 代替完整模型 ID。",
    "customProvider.step5Hint3": "按 Enter 跳过。",
    "customProvider.step5Prompt": "输入别名：",
    "customProvider.step5Placeholder": "",

    "customProvider.verifying": "验证模型配置...",
    "customProvider.verifyFailed": "验证失败：{error}",
    "customProvider.verifyFailedHint": "您想怎么处理？",
    "customProvider.saveAnyway": "仍然保存",
    "customProvider.saveAnywayDesc": "可能是临时网络问题",
    "customProvider.fixApiKey": "修改 API 密钥",
    "customProvider.fixApiKeyDesc": "仅重新输入 API 密钥",
    "customProvider.fixModelName": "修改模型名称",
    "customProvider.fixModelNameDesc": "仅重新输入模型名称",
    "customProvider.startOver": "从头开始",
    "customProvider.startOverDesc": "从头重新输入所有字段",

    "customProvider.providerExists": "提供商已存在",
    "customProvider.providerLabel": "提供商：\"{name}\"",
    "customProvider.sameBaseUrl": "发现相同的 baseUrl。请选择：",
    "customProvider.addToExisting": "是 — 添加模型到现有提供商",
    "customProvider.addToExistingDesc": "复用现有 API 密钥 (...{keySuffix})",
    "customProvider.createNew": "否 — 使用不同的 API 密钥创建新提供商",
    "customProvider.createNewDesc": "如果您有同一端点的不同密钥，请使用此项",

    "customProvider.formatOpenAI": "OpenAI Chat Completions",
    "customProvider.formatAnthropic": "Anthropic Messages",
    "customProvider.noApiKey": "未设置 API 密钥",
    "customProvider.cancel": "取消",

    // Effort levels
    "effort.level": "推理力度",
    "effort.auto": "自动",
    "effort.currently": "当前 {level}",
    "effort.low": "低",
    "effort.medium": "中",
    "effort.high": "高",
    "effort.max": "最大",
    "effort.lowDesc": "快速、简单的实现，开销最小",
    "effort.mediumDesc": "平衡的方法，标准的实现和测试",
    "effort.highDesc": "全面的实现，广泛的测试和文档",
    "effort.maxDesc": "最大能力，最深推理（仅限 Opus 4.6）",

    "effortCallout.mediumRecommended": "中（推荐）",
    "effortCallout.high": "高",
    "effortCallout.low": "低",

    // Dialogs
    "dialog.exportTitle": "导出对话",
    "dialog.exportSubtitle": "选择导出方式：",
    "dialog.deleteAgent": "删除智能体",
    "dialog.deleteAgentConfirm": "确定要删除此智能体吗？",
    "dialog.noAgentsFound": "未找到智能体",
    "dialog.viewAgent": "查看智能体",
    "dialog.editAgent": "编辑智能体",
    "dialog.switchToStable": "切换到稳定通道",
    "dialog.allowDowngrade": "允许可能降级到稳定版本",
    "dialog.enableAutoMode": "启用自动模式？",
    "dialog.autoModeDescription": "自动模式让 Claude Code 自动运行工具而无需每次确认。您仍可以查看和批准操作。",
    "dialog.customApiKey": "检测到环境中有自定义 API 密钥",
    "dialog.customApiKeyHint": "这允许访问您的自定义提供商。",
    "dialog.allowExternalIncludes": "允许外部 CLAUDE.md 文件导入？",
    "dialog.costThreshold": "已达到成本阈值",
    "dialog.gotIt": "知道了，谢谢！",
    "dialog.notNow": "暂不",
    "dialog.continueConversation": "继续此对话",
    "dialog.newConversation": "作为新对话发送",
    "dialog.openInDesktop": "在 Claude Code 桌面版中打开",

    // Diff
    "diff.turn": "第 {index} 轮",
    "diff.uncommitted": "未提交的更改",
    "diff.current": "当前",
    "diff.loading": "加载差异中…",
    "diff.noChangesTurn": "此轮无文件变更",
    "diff.tooManyFiles": "文件太多无法显示详情",
    "diff.cleanTree": "工作区干净",
    "diff.dialogDismissed": "差异对话框已关闭",
    "diff.sourceSelect": "←/→ 切换来源",
    "diff.selectFile": "↑/↓ 选择",
    "diff.viewFile": "Enter 查看",
    "diff.close": "关闭",
    "diff.goBack": "← 返回",

    // Agent
    "agent.runningBackground": "后台运行中",
    "agent.allToolsSelected": "已选择所有工具",
    "agent.toolsSelected": "已选择 {count}/{total} 个工具",
    "agent.currentModel": "当前模型（自定义 ID）",
    "agent.showAdvanced": "显示高级选项",
    "agent.hideAdvanced": "隐藏高级选项",
    "agent.chooseColor": "选择背景颜色",
    "agent.selectTools": "选择工具",
    "agent.agentType": "智能体类型（标识符）",
    "agent.descriptionRequired": "描述为必填项",

    // Tool
    "tool.executionFailed": "工具执行失败",
    "tool.invalidParams": "工具参数无效",

    // Export
    "export.copyToClipboard": "复制到剪贴板",
    "export.copyToClipboardDesc": "将对话复制到系统剪贴板",
    "export.saveToFile": "保存到文件",
    "export.saveToFileDesc": "将对话保存到当前目录的文件",
    "export.enterFilename": "输入文件名：",
    "export.copiedToClipboard": "对话已复制到剪贴板",
    "export.exportedTo": "对话已导出到：{path}",
    "export.failed": "导出对话失败：{error}",
    "export.cancelled": "导出已取消",

    // Idle
    "idle.awayMessage": "您已离开 {duration}，此对话已有 {tokens} tokens。",
    "idle.newTaskHint": "如果是新任务，清除上下文可以节省用量并加快速度。",
    "idle.dontAskAgain": "不再询问",

    // Cost Threshold
    "costThreshold.spent": "本次会话您已在 Anthropic API 上花费 ${amount}。",
    "costThreshold.learnMore": "了解更多关于如何监控您的支出：",

    // Approve API Key
    "approveApiKey.useKey": "您想使用此 API 密钥吗？",
    "approveApiKey.yes": "是",
    "approveApiKey.no": "否",
    "approveApiKey.recommended": "推荐",

    // Agents menu
    "agents.viewAgent": "查看智能体",
    "agents.editAgent": "编辑智能体",
    "agents.deleteAgent": "删除智能体",
    "agents.deleteConfirm": "确定要删除此智能体吗？",
    "agents.back": "返回",
    "agents.continue": "继续",
    "agents.noAgentsFound": "未找到智能体",
    "agents.agentsDialogDismissed": "智能体对话框已关闭",
    "agents.editAgentTitle": "编辑智能体：{name}",

    // Feedback
    "feedback.continue": "继续",
    "feedback.submit": "提交",
    "feedback.cancel": "取消",

    // Grove
    "grove.notNow": "暂不",
    "grove.pressAgainToExit": "再按 {key} 退出",
    "grove.toggle": "切换",

    // Dev Channels
    "devChannels.exit": "退出",
    "devChannels.title": "警告：正在加载开发通道",
    "devChannels.warning": "--dangerously-load-development-channels 仅用于本地通道开发。请勿使用此选项运行从互联网下载的通道。",
    "devChannels.useChannels": "请使用 --channels 运行已批准的通道列表。",
    "devChannels.channels": "通道：",
    "devChannels.localDev": "我正在用于本地开发",

    // Context
    "context.freeSpace": "可用空间",

    // Auto Mode
    "autoMode.title": "启用自动模式？",
    "autoMode.description": "自动模式让 Claude Code 自动运行工具而无需每次确认。您仍可以查看和批准操作。",
    "autoMode.enable": "是，启用自动模式",
    "autoMode.stayManual": "否，保持手动模式",
    "autoMode.yesDefault": "是，并设为默认模式",
    "autoMode.noExit": "否，退出",
    "autoMode.noGoBack": "否，返回",

    // Welcome (Chinese)
    "welcome.message": "欢迎使用 Claude Code",
    "welcome.getStarted": "在下方输入消息开始",
    "welcome.typeHelp": "输入 /help 查看可用命令",
  }
}

// Current language state
let currentLanguage: UILanguage = 'en'

/**
 * Set the UI language
 */
export function setUILanguage(lang: UILanguage): void {
  currentLanguage = lang
}

/**
 * Get the current UI language
 */
export function getUILanguage(): UILanguage {
  return currentLanguage
}

/**
 * Translate a key to the current language
 *
 * @param key - Translation key (dot-notation, e.g., "welcome.title")
 * @param params - Optional parameters for interpolation
 * @returns Translated string
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const langTranslations = translations[currentLanguage]

  let text = langTranslations[key]

  // Fallback to English if not found in current language
  if (text === undefined && currentLanguage !== 'en') {
    text = translations.en[key]
  }

  // Still not found, return the key itself
  if (text === undefined) {
    return key
  }

  // Interpolate parameters
  if (params) {
    for (const [paramKey, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
    }
  }

  return text
}

/**
 * Detect system language preference
 *
 * Priority:
 * 1. CLAUDE_CODE_UI_LANGUAGE env var
 * 2. System locale via Intl API
 * 3. Default to 'en'
 */
/**
 * Debug function to log locale detection details
 * Useful for diagnosing auto-detection issues
 */
export function getLocaleDetectionDebugInfo(): Record<string, unknown> {
  const info: Record<string, unknown> = {
    platform: process.platform,
    envVars: {
      CLAUDE_CODE_UI_LANGUAGE: process.env.CLAUDE_CODE_UI_LANGUAGE,
      LC_ALL: process.env.LC_ALL,
      LC_MESSAGES: process.env.LC_MESSAGES,
      LANG: process.env.LANG,
      LC_CTYPE: process.env.LC_CTYPE,
    },
    intl: {} as Record<string, unknown>,
  }

  try {
    info.intl = {
      DateTimeFormat: Intl.DateTimeFormat().resolvedOptions(),
      NumberFormat: Intl.NumberFormat().resolvedOptions(),
      Collator: Intl.Collator().resolvedOptions(),
    }
  } catch (e) {
    info.intl = { error: String(e) }
  }

  return info
}

export function detectSystemLanguage(): UILanguage {
  // 1. Check explicit environment variable first
  const envLang = process.env.CLAUDE_CODE_UI_LANGUAGE?.toLowerCase()
  if (envLang === 'zh' || envLang?.startsWith('zh-')) return 'zh'
  if (envLang === 'en' || envLang?.startsWith('en-')) return 'en'

  // 2. Check standard locale environment variables (Unix/macOS/Linux)
  // Priority: LC_ALL > LC_MESSAGES > LANG
  // Parse locale like "zh_CN.UTF-8", "en_US.UTF-8", "zh_TW", etc.
  const checkLocaleEnv = (envValue: string | undefined): UILanguage | null => {
    if (!envValue) return null
    const langCode = envValue.split('.')[0].split('_')[0].toLowerCase()
    if (langCode === 'zh') return 'zh'
    if (langCode === 'en') return 'en'
    return null
  }

  const lcAllResult = checkLocaleEnv(process.env.LC_ALL)
  if (lcAllResult) return lcAllResult

  const lcMessagesResult = checkLocaleEnv(process.env.LC_MESSAGES)
  if (lcMessagesResult) return lcMessagesResult

  const langResult = checkLocaleEnv(process.env.LANG)
  if (langResult) return langResult

  // Also check LC_CTYPE which is sometimes set on macOS
  const lcCtypeResult = checkLocaleEnv(process.env.LC_CTYPE)
  if (lcCtypeResult) return lcCtypeResult

  // 3. Use Intl API to detect system locale (fallback for Windows/modern terminals)
  try {
    // Try multiple Intl formatters for better coverage
    const dateTimeLocale = Intl.DateTimeFormat().resolvedOptions().locale
    if (dateTimeLocale.startsWith('zh')) return 'zh'

    const numberLocale = Intl.NumberFormat().resolvedOptions().locale
    if (numberLocale.startsWith('zh')) return 'zh'

    // Try Collator as well
    const collatorLocale = Intl.Collator().resolvedOptions().locale
    if (collatorLocale.startsWith('zh')) return 'zh'
  } catch {
    // Ignore Intl errors
  }

  // 4. Default to English
  return 'en'
}

/**
 * Get available UI languages
 */
export function getAvailableLanguages(): Array<{ code: UILanguage; name: string; nativeName: string }> {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
  ]
}

/**
 * Initialize i18n with auto-detection or saved preference
 *
 * @param savedLanguage - Saved language preference from settings (can be 'auto', 'en', 'zh')
 */
export function initI18n(savedLanguage?: string): void {
  if (!savedLanguage || savedLanguage === 'auto' || savedLanguage === '') {
    // Auto-detect
    const detected = detectSystemLanguage()
    setUILanguage(detected)
  } else if (savedLanguage === 'en' || savedLanguage === 'zh') {
    setUILanguage(savedLanguage)
  } else {
    // Invalid value, fall back to auto-detect
    const detected = detectSystemLanguage()
    setUILanguage(detected)
  }
}
