// locales/zh/permissions.ts
export const permissions = {
  "toolUse": "工具使用",
  "yes": "是",
  "no": "否",
  "yesAlways": "是，总是",
  "noAlways": "否，总是",
  "allow": "允许",
  "deny": "拒绝",
  "allowOnce": "允许一次",
  "denyOnce": "拒绝一次",
  "allowAll": "全部允许",
  "denyAll": "全部拒绝",
  "editFile": "编辑文件",
  "runCommand": "运行命令",
  "command": "命令：",
  "file": "文件：",
  "directory": "目录："
}

export const trust = {
  "accessingWorkspace": "正在访问工作区：",
  "safetyCheck": "快速安全检查：这是您创建或信任的项目吗？（比如您自己的代码、知名开源项目或团队作品）。如果不是，请先花点时间查看此文件夹的内容。",
  "permissionWarning": "Claude Code 将能够在此读取、编辑和执行文件。",
  "securityGuide": "安全指南",
  "yesTrust": "是，我信任此文件夹",
  "noExit": "否，退出",
  "pressAgainExit": "再按 {key} 退出",
  "confirmHint": "Enter 确认 · Esc 取消"
}

export const bypass = {
  "title": "警告：Claude Code 正在绕过权限模式下运行",
  "warning": "在绕过权限模式下，Claude Code 不会在运行潜在危险命令前请求您的批准。",
  "restriction": "此模式仅应在具有受限互联网访问且易于恢复的沙盒容器/虚拟机中使用。",
  "responsibility": "继续即表示您接受在绕过权限模式下执行操作的所有责任。",
  "noExit": "否，退出",
  "yesAccept": "是，我接受"
}

export const shell = {
  "yesAllowAccess": "是，并始终允许访问 {path}",
  "yesAllowAccessMultiple": "是，并始终允许从此项目访问 {paths}",
  "yesAllowRead": "是，允许从此项目读取 {paths}",
  "yesAllowCommand": "是，并始终允许在此项目中运行 {command}",
  "yesAllowCommands": "是，并始终允许在此项目中运行这些命令",
  "checkingAutoApprove": "正在尝试自动批准\u2026",
  "autoApproved": "已自动批准",
  "yes": "是",
  "tellClaudeNext": "并告诉 Claude 下一步做什么",
  "yesDontAskAgain": "是，以后不再询问",
  "commandPrefix": "命令前缀（例如 npm run:*）",
  "describeWhatToAllow": "描述要允许的内容...",
  "no": "否",
  "tellClaudeDifferently": "并告诉 Claude 其他做法"
}

// 进入计划模式对话框
export const enterPlan = {
  "desc": "Claude 想要进入计划模式，以探索和设计实现方案。",
  "inPlanMode": "在计划模式下，Claude 将：",
  "exploreCodebase": "深入探索代码库",
  "identifyPatterns": "识别现有模式",
  "designStrategy": "设计实现策略",
  "presentPlan": "呈现计划供您审批",
  "noCodeChanges": "在您批准计划之前，不会进行任何代码更改。",
  "yesEnterPlan": "是，进入计划模式",
  "noStartImplementing": "否，立即开始实现",
  "title": "进入计划模式？"
}

// 退出计划模式对话框
export const exitPlan = {
  "pastedImage": "粘贴的图片",
  "noPlanFound": "未找到计划。请先将计划写入计划文件。",
  "ultraplanRefining": "计划正在通过 Ultraplan 优化 -- 请等待结果。",
  "implementPlan": "实现以下计划：\n\n",
  "seeAttachedImage": "（见附图）",
  "wouldYouLikeToProceed": "您想继续吗？",
  "ctrlGToEditIn": "ctrl-g 在 ",
  "planSaved": "计划已保存！",
  "exitPlanTitle": "退出计划模式？",
  "claudeWantsToExit": "Claude 想要退出计划模式",
  "yes": "是",
  "no": "否",
  "readyToCode": "准备好编码了吗？",
  "hereIsClaudesPlan": "以下是 Claude 的计划：",
  "requestedPermissions": "请求的权限：",
  "claudeWrittenPlan": "Claude 已写出计划并准备执行。您想继续吗？",
  "usedPercent": "（{percent}% 已使用）",
  "clearContextAutoMode": "是，清除上下文并使用自动模式",
  "clearContextBypass": "是，清除上下文并绕过权限",
  "clearContextAutoAccept": "是，清除上下文并自动接受编辑",
  "yesAutoMode": "是，并使用自动模式",
  "yesBypass": "是，并绕过权限",
  "yesAutoAccept": "是，自动接受编辑",
  "yesManualApprove": "是，手动审批编辑",
  "noUltraplan": "否，在 Claude Code 网页版上使用 Ultraplan 优化",
  "noKeepPlanning": "否，继续规划",
  "tellClaudeWhatToChange": "告诉 Claude 要更改什么",
  "shiftTabApprove": "shift+tab 以此反馈批准"
}

// 计算机使用审批
export const computerUse = {
  "openAccessibility": "打开系统设置 \u2192 辅助功能",
  "openScreenRecording": "打开系统设置 \u2192 屏幕录制",
  "tryAgain": "重试",
  "granted": "已授权",
  "notGranted": "未授权",
  "accessibility": "辅助功能：",
  "screenRecording": "屏幕录制：",
  "grantMissingPermissions": "请在系统设置中授予缺失的权限，然后选择「重试」。macOS 可能要求您在授予屏幕录制权限后重启 Claude Code。",
  "needsMacOSPermissions": "计算机使用需要 macOS 权限",
  "shellAccess": "等同于 shell 访问权限",
  "readWriteAnyFile": "可以读写任何文件",
  "changeSystemSettings": "可以更改系统设置",
  "allowForSession": "在本次会话中允许（{count} 个{apps}）",
  "denyTellClaude": "拒绝，并告诉 Claude 其他做法",
  "esc": "(esc)",
  "notInstalled": "（未安装）",
  "alreadyGranted": "（已授权）",
  "alsoRequested": "还请求了：",
  "hiddenApps": "{count} 个其他{apps}将在 Claude 工作时隐藏。",
  "wantsToControlApps": "计算机使用想要控制这些应用"
}

// 文件编辑权限
export const fileEditPerm = {
  "title": "编辑文件",
  "doYouWantToMakeEdit": "您是否要对此文件进行编辑"
}

// 文件写入权限
export const fileWritePerm = {
  "overwrite": "覆盖",
  "create": "创建",
  "overwriteTitle": "覆盖文件",
  "createTitle": "创建文件",
  "doYouWantTo": "您是否要"
}

// 笔记本编辑权限
export const notebookEditPerm = {
  "insertCell": "插入新单元格",
  "deleteCell": "删除单元格",
  "replaceCellContents": "替换单元格内容",
  "forCell": " 单元格 ",
  "title": "编辑笔记本",
  "insertThisCell": "将此单元格插入",
  "deleteThisCell": "从此处删除单元格",
  "makeThisEdit": "对此进行编辑",
  "doYouWantTo": "您是否要 "
}

// 网页获取权限
export const webFetchPerm = {
  "yes": "是",
  "yesDontAskAgain": "是，以后不再询问 ",
  "noTellClaude": "否，告诉 Claude 其他做法 ",
  "esc": "(esc)",
  "doYouWantToAllow": "您是否要允许 Claude 获取此内容？",
  "title": "获取"
}

// 沙箱/网络权限
export const sandboxPerm = {
  "yes": "是",
  "yesDontAskAgain": "是，以后不再询问 ",
  "noTellClaude": "否，告诉 Claude 其他做法 ",
  "esc": "(esc)",
  "host": "主机：",
  "doYouWantToAllow": "您是否要允许此连接？",
  "title": "沙箱外的网络请求"
}

// 技能权限
export const skillPerm = {
  "yes": "是",
  "yesDontAskAgainFor": "是，以后不再询问 ",
  "in": " 在",
  "commandsIn": " 命令在",
  "no": "否",
  "title": "使用技能\"{skill}\"？",
  "warning": "Claude 可能会使用此技能中的指令、代码或文件。"
}

// 回退权限
export const fallback = {
  "yesDontAskAgainFor": "是，以后不再询问 ",
  "mcp": " (MCP)"
}

// Monitor 权限
export const monitorPermission = {
  "toolUse": "监控命令",
  "yesDontAskAgain": "是，以后不再询问 Monitor 命令"
}

// 文件系统权限
export const filesystem = {
  "read": "读取",
  "edit": "编辑",
  "title": "{action}文件"
}

// Sed 编辑权限
export const sedEdit = {
  "fileDoesNotExist": "文件不存在",
  "patternNotMatched": "模式未匹配任何内容",
  "doYouWantToMakeEdit": "您是否要对此进行编辑",
  "title": "编辑文件"
}

// PowerShell 权限
export const powershell = {
  "title": "PowerShell 命令",
  "toolName": "PowerShell",
  "doYouWantToProceed": "您要继续吗？",
  "escToCancel": "Esc 取消",
  "tabToAmend": " \u00b7 Tab 修改",
  "ctrlEToExplain": " \u00b7 ctrl+e {action}",
  "actionExplain": "解释",
  "actionHide": "隐藏",
  "ctrlDToHide": "Ctrl-D 隐藏调试信息",
  "ctrlDToShow": "Ctrl+d 显示调试信息",
  "confirmation": "确认",
  "yes": "是",
  "tellClaudeNext": "并告诉 Claude 下一步做什么",
  "yesDontAskAgain": "是，以后不再询问",
  "commandPrefix": "命令前缀（例如 Get-Process:*）",
  "no": "否",
  "tellClaudeDifferently": "并告诉 Claude 其他做法"
}

// 权限提示
export const prompt = {
  "tellClaudeNext": "告诉 Claude 下一步做什么",
  "tellClaudeDifferently": "告诉 Claude 其他做法",
  "doYouWantToProceed": "您要继续吗？",
  "confirmation": "确认",
  "tabToAmend": " \u00b7 Tab 修改",
  "escToCancel": "Esc 取消"
}

// 权限请求通知
export const request = {
  "needsApproval": "Claude Code 需要您批准该计划",
  "wantsToEnterPlan": "Claude Code 想要进入计划模式",
  "needsApprovalReview": "Claude 需要您批准审查产物",
  "needsAttention": "Claude Code 需要您的注意",
  "needsPermission": "Claude 需要您的许可才能使用 {toolName}",
  "confirmation": "确认"
}

// 权限解释
export const explanation = {
  "loading": "正在加载解释\u2026",
  "lowRisk": "低风险",
  "medRisk": "中风险",
  "highRisk": "高风险",
  "unavailable": "解释不可用"
}

// 权限规则解释
export const ruleExplanation = {
  "autoModeClassifier": "自动模式分类器需要确认此{toolType}。\n{reason}",
  "classifier": "分类器 {classifier} 需要确认此{toolType}。\n{reason}",
  "permissionRule": "权限规则 {rule} 需要确认此{toolType}。",
  "permissionsToUpdate": "/permissions 更新规则",
  "hook": "钩子 {hookName} 需要确认此{toolType}{hookReason}{sourceLabel}",
  "hooksToUpdate": "/hooks 更新",
  "permissionsToUpdateRules": "/permissions 更新规则"
}

// 权限决策调试信息
export const debugInfo = {
  "classifier": "{classifier} 分类器：{reason}",
  "rule": "{rule} 规则来自 {source}",
  "mode": "{mode} 模式",
  "sandbox": "需要权限绕过沙箱",
  "tool": "{toolName} 权限提示工具",
  "hook": "{hookName} 钩子：{reason}",
  "hookNoReason": "{hookName} 钩子",
  "suggestedRules": "建议的规则：",
  "none": "无",
  "suggestion": "建议 ",
  "suggestions": "建议 ",
  "rules": " 规则 ",
  "directories": " 目录 ",
  "modeCategory": " 模式 ",
  "behavior": "行为 ",
  "message": "消息 ",
  "reason": "原因 ",
  "undefined": "未定义",
  "unreachableRules": "{icon} 不可达规则（{count}）",
  "fix": "修复："
}

// 工作进程等待权限
export const workerPending = {
  "waitingForApproval": " 正在等待团队负责人审批",
  "tool": "工具：",
  "action": "操作：",
  "permissionRequestSent": "权限请求已发送至团队\"{teamName}\"负责人"
}

// 询问用户问题权限
export const auq = {
  "linesHidden": "{count} 行隐藏 ",
  "submit": "提交",
  "reviewAnswers": "查看您的回答",
  "notAllAnswered": "{icon} 您尚未回答所有问题",
  "question": "问题",
  "readyToSubmit": "准备好提交您的回答了吗？",
  "submitAnswers": "提交回答",
  "noPreviewAvailable": "无预览可用",
  "notes": "备注：",
  "addNotes": "在此设计上添加备注\u2026",
  "pressNToAddNotes": "按 n 添加备注",
  "chatAboutThis": "讨论此内容",
  "skipInterview": "跳过访谈并立即规划",
  "enterToSelect": "Enter 选择",
  "nToAddNotes": "n 添加备注",
  "tabToSwitch": "Tab 切换问题",
  "ctrlGToEditIn": "ctrl+g 在 {editorName} 中编辑",
  "escToCancel": "Esc 取消",
  "toNavigate": "{arrowUp}/{arrowDown} 导航",
  "tabArrowsToNavigate": "Tab/方向键导航",
  "typeSomething": "输入内容",
  "other": "其他",
  "planning": "规划：",
  "next": "下一步",
  "pastedImage": "粘贴的图片",
  "noAnswerProvided": "（未提供答案）",
  "imageAttached": "（已附图）",
  "clarifyFeedback": "用户想澄清这些问题。\n    这意味着他们可能有额外的信息、上下文或问题。\n    请考虑他们的回复，并在适当时重新组织问题。\n    首先询问他们想澄清什么。\n\n    被问及的问题：\n{questionsWithAnswers}",
  "finishPlanFeedback": "用户已表示他们已为计划访谈提供了足够的答案。\n停止询问澄清问题，并利用您已有的信息完成计划。\n\n被问及的问题和提供的答案：\n{questionsWithAnswers}"
}

// 权限规则管理
export const rules = {
  "projectSettingsLocal": "项目设置（本地）",
  "savedIn": "保存于 {path}",
  "projectSettings": "项目设置",
  "checkedInAt": "签入于 {path}",
  "userSettings": "用户设置",
  "savedInHome": "保存于 ~/.claude/settings.json",
  "rule": "规则",
  "addPermission": "添加 {behavior} 权限 {ruleCount}",
  "whereToSaveRule": "此规则应保存到哪里？",
  "whereToSaveRules": "这些规则应保存到哪里？",
  "yesForThisSession": "是，仅本次会话",
  "yesAndRemember": "是，并记住此目录",
  "no": "否",
  "willHaveAccess": "Claude Code 将能够读取此目录中的文件，并在启用自动接受编辑时进行编辑。",
  "enterPath": "输入目录路径：",
  "directoryPath": "目录路径{ellipsis}",
  "addDirectoryTitle": "将目录添加到工作区",
  "pressAgainToExit": "再按 {key} 退出",
  "anyBashCommandStarting": "任何以此开头的 Bash 命令",
  "theBashCommand": "Bash 命令",
  "anyBashCommand": "任何 Bash 命令",
  "anyUseOfThe": "任何使用",
  "tool": "工具",
  "or": " 或 ",
  "permissionRulesDescription": "权限规则由工具名称组成，可选地在括号中添加说明符。",
  "enterPermissionRule": "输入权限规则{ellipsis}",
  "from": "来自 {source}",
  "allowed": "允许",
  "denied": "拒绝",
  "ask": "询问",
  "ruleDetails": "规则详情",
  "managedRuleMessage": "此规则由托管设置配置，无法修改。\n请联系系统管理员了解更多信息。",
  "deleteTool": "删除 {tool} 工具？",
  "areYouSureDelete": "您确定要删除此权限规则吗？",
  "willNotAskBeforeUsing": "Claude Code 不会在使用允许的工具前询问。",
  "willAlwaysAsk": "Claude Code 将始终在使用这些工具前请求确认。",
  "willAlwaysReject": "Claude Code 将始终拒绝使用被拒绝工具的请求。",
  "noRecentDenials": "没有最近的拒绝记录。被自动模式分类器拒绝的命令将显示在此处。",
  "retry": " （重试）",
  "recentlyDenied": "被自动模式分类器最近拒绝的命令。",
  "willNoLongerHaveAccess": "Claude Code 将不再能够访问此目录中的文件。",
  "removeDirectoryTitle": "从工作区移除目录？",
  "workspaceDialogDismissed": "工作区对话框已关闭",
  "addDirectory": "添加目录{ellipsis}",
  "originalWorkingDirectory": "（原始工作目录）",
  "yes": "是",
  "escToCancel": "Esc 取消",
  "recentlyDeniedTab": "最近拒绝",
  "workspaceTab": "工作区",
  "permissionsDialogDismissed": "权限对话框已关闭"
}
