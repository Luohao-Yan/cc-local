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
  "yesAllowCommands": "是，并始终允许在此项目中运行这些命令"
}
