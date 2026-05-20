// locales/zh/tools.ts
export const toolSelector = {
  "hint": "选择此代理可以使用的工具。",
  "allTools": "所有工具",
  "allSelected": "已选择全部 {count} 个工具",
  "selected": "已选择 {count}/{total} 个工具"
}

export const tool = {
  "executionFailed": "工具执行失败",
  "invalidParams": "工具参数无效"
}

// Bash 工具
export const bash = {
  "runInBackground": "后台运行",
  "running": "运行中…",
  "waiting": "等待中…"
}

// Agent 工具 UI 字符串（加前缀避免与 agent.ts 模块冲突）
export const agentTool = {
  "prompt": "提示：",
  "response": "响应：",
  "remoteAgentLaunched": "远程代理已启动",
  "backgroundedAgent": "后台代理",
  "manage": "管理",
  "expand": "展开",
  "toolUse": "{count} 次工具调用",
  "toolUses": "{count} 次工具调用",
  "tokens": "令牌",
  "done": "完成",
  "initializing": "初始化中…",
  "inProgress": "进行中…",
  "moreToolUse": "次更多工具调用",
  "moreToolUses": "次更多工具调用",
  "backgroundAgentsLaunched": "个后台代理已启动",
  "agentsFinished": "个代理已完成",
  "agents": "个代理",
  "running": "运行中",
  "agentsEllipsis": "个代理…",
  "agentLabel": "代理"
}

// Brief 工具
export const brief = {
  "claude": "Claude",
  "image": "[图片]",
  "file": "[文件]"
}

// FileRead 工具
export const fileRead = {
  "pages": "· 第 {pages} 页",
  "linesRange": "第 {start}-{end} 行",
  "fromLine": "从第 {start} 行",
  "readImage": "读取图片",
  "noCellsFound": "笔记本中未找到单元格",
  "readCell": "读取",
  "cells": "个单元格",
  "cell": "个单元格",
  "readPdf": "读取 PDF",
  "page": "页",
  "pages_": "页",
  "readFile": "读取",
  "line": "行",
  "lines_": "行",
  "unchangedSinceLastRead": "自上次读取后未更改",
  "fileNotFound": "文件未找到",
  "errorReadingFile": "读取文件出错",
  "readingPlan": "读取计划",
  "readAgentOutput": "读取代理输出",
  "read": "读取"
}

// FileWrite 工具
export const fileWrite = {
  "noContent": "(无内容)",
  "wroteLinesTo": "将 {count} 行写入{path}",
  "plusLine": "行",
  "plusLines": "行",
  "updatedPlan": "已更新计划",
  "write": "写入",
  "noChanges": "(无更改)",
  "errorWritingFile": "写入文件出错",
  "planToPreview": "/plan 预览",
  "overwrite": "覆盖",
  "create": "创建",
  "overwriteTitle": "覆盖文件",
  "createTitle": "创建文件",
  "doYouWantTo": "是否要"
}

// FileEdit 工具
export const fileEdit = {
  "update": "更新",
  "updatedPlan": "已更新计划",
  "create": "创建",
  "planToPreview": "/plan 预览",
  "fileMustBeReadFirst": "必须先读取文件",
  "fileNotFound": "文件未找到",
  "stringNotFoundInFile": "在文件中未找到字符串 — 文本与当前内容不匹配",
  "fileWasModifiedAfterLastRead": "文件在上次读取后被修改 — 编辑前请重新读取",
  "multipleMatchesFound": "找到多个匹配项 — 设置 replace_all:true 或提供更多上下文",
  "fileAlreadyExists": "文件已存在 — 请使用更新而非创建",
  "fileTooLargeToEdit": "文件太大无法编辑",
  "errorEditingFile": "编辑文件出错"
}

// Glob 工具
export const glob = {
  "search": "搜索",
  "pattern": "模式: \"{pattern}\"",
  "patternWithPath": "模式: \"{pattern}\", 路径: \"{path}\"",
  "fileNotFound": "文件未找到",
  "errorSearchingFiles": "搜索文件出错"
}

// Grep 工具
export const grep = {
  "found": "找到",
  "across": "跨越",
  "files": "个文件",
  "pattern": "模式: \"{pattern}\"",
  "path": "路径: \"{path}\"",
  "fileNotFound": "文件未找到",
  "errorSearchingFiles": "搜索文件出错",
  "lines": "行",
  "matches": "个匹配",
  "line_": "行"
}

// LSP 工具
export const lsp = {
  "definition": "定义",
  "definitions": "定义",
  "reference": "引用",
  "references": "引用",
  "symbol": "符号",
  "symbols": "符号",
  "hoverInfo": "悬停信息",
  "hoverInfoAvailable": "可用",
  "implementation": "实现",
  "implementations": "实现",
  "callItem": "调用项",
  "callItems": "调用项",
  "caller": "调用者",
  "callers": "调用者",
  "callee": "被调用者",
  "callees": "被调用者",
  "result": "结果",
  "results": "结果",
  "hoverInfoLabel": "悬停信息",
  "found": "找到",
  "across": "，涉及",
  "files": "个文件",
  "lspLabel": "LSP",
  "operation": "操作: \"{operation}\"",
  "symbolQuery": "符号: \"{symbol}\"",
  "inQuery": "在: \"{path}\"",
  "fileQuery": "文件: \"{path}\"",
  "positionQuery": "位置: {line}:{character}",
  "lspOperationFailed": "LSP 操作失败"
}

// MCP 工具 UI 字符串（加前缀避免与 mcp.ts 模块冲突）
export const mcpTool = {
  "running": "运行中…",
  "processing": "处理中… {progress}",
  "sentMessageTo": "发送消息至",
  "largeResponseWarning": "⚠ MCP 响应较大（约 {tokens} 令牌），可能快速填满上下文",
  "imageBlock": "[图片]",
  "noContent": "(无内容)",
  "slack": "slack"
}

// NotebookEdit 工具
export const notebookEdit = {
  "errorEditingNotebook": "编辑笔记本出错",
  "updatedCell": "已更新单元格 {cellId}："
}

// Skill 工具
export const skill = {
  "initializing": "初始化中…",
  "done": "完成",
  "successfullyLoaded": "成功加载技能",
  "tool": "个工具",
  "tools": "个工具",
  "allowed": "已允许",
  "moreToolUse": "次更多工具调用",
  "moreToolUses": "次更多工具调用"
}

// WebFetch 工具
export const webFetch = {
  "url": "网址: \"{url}\"",
  "prompt": "提示: \"{prompt}\"",
  "fetching": "获取中…",
  "received": "已获取",
}

// WebSearch 工具
export const webSearch = {
  "query": "\"{query}\"",
  "onlyAllowingDomains": "仅允许域名: {domains}",
  "blockingDomains": "屏蔽域名: {domains}",
  "searching": "搜索中: {query}",
  "foundResults": "找到 {count} 个关于 \"{query}\" 的结果",
  "didSearch": "执行了 {count} 次搜索",
  "searches": "",
  "in": "，耗时 {time}"
}

// Monitor 工具
export const monitor = {
  "monitoring": "监控中…",
  "exited": "进程已退出",
}
