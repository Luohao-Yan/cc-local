/**
 * Bash 工具 - 执行 shell 命令（简化版）
 */

import { spawn } from 'child_process'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface BashInput {
  command: string
  timeout?: number
  cwd?: string
}

const dangerousPatterns: Array<{ pattern: RegExp; message: string }> = [
  // Fork bombs
  { pattern: /:\(\)\{[^}]*:[|&][^}]*\}/, message: 'Fork bomb detected' },
  // Recursive force delete of root or large subtrees
  { pattern: /rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?(-[a-zA-Z]*r[a-zA-Z]*\s+)?\//, message: 'Recursive force delete of root path' },
  { pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+)?(-[a-zA-Z]*f[a-zA-Z]*\s+)?\//, message: 'Recursive force delete of root path' },
  { pattern: /rm\s+-[a-zA-Z]*rf\s+~/, message: 'Recursive force delete of home directory' },
  { pattern: /rm\s+-[a-zA-Z]*rf\s+~\//, message: 'Recursive force delete under home directory' },
  // Process substitution (executes arbitrary code)
  { pattern: /<\(/, message: 'Process substitution <() executes arbitrary code' },
  { pattern: />\(/, message: 'Process substitution >() executes arbitrary code' },
  // Shell eval/exec
  { pattern: /\beval\s/, message: 'eval executes arbitrary code' },
  { pattern: /\bexec\s/, message: 'exec replaces process' },
  { pattern: /(?:^|\s)(?:bash|sh|zsh|dash)\s+-c\s/, message: 'Shell -c executes arbitrary code' },
  // Environment variable exfiltration
  { pattern: /\benv\b/, message: 'env can dump all environment variables' },
  { pattern: /\bprintenv\b/, message: 'printenv can dump all environment variables' },
  // Command substitution — commonly used in injection
  { pattern: /\$\(/, message: '$() command substitution — requires approval' },
  { pattern: /\$\{/, message: '${} parameter expansion — requires approval' },
  // Disk/device overwrite
  { pattern: /\bdd\s/, message: 'dd can overwrite disks' },
  { pattern: /\bmkfs/, message: 'mkfs formats filesystems' },
  // Piped remote script execution
  { pattern: /(?:curl|wget)\s+.*\|\s*(?:bash|sh|zsh|dash)/, message: 'Piped remote script execution' },
  // Package installation (supply chain risk)
  { pattern: /(?:npm|yarn|pnpm)\s+(?:install|i|add|ci)\s/, message: 'Package installation requires approval' },
  { pattern: /(?:pip|pip3)\s+install\s/, message: 'Python package installation requires approval' },
  { pattern: /(?:bun)\s+(?:add|install)\s/, message: 'Bun package installation requires approval' },
  // Kernel module manipulation
  { pattern: /\bmodprobe\b/, message: 'Kernel module loading' },
  { pattern: /\binsmod\b/, message: 'Kernel module insertion' },
  { pattern: /\brmmod\b/, message: 'Kernel module removal' },
  // System service manipulation
  { pattern: /\bsystemctl\s+(?:start|stop|restart|enable|disable)\s/, message: 'System service manipulation' },
  { pattern: /\bservice\s+\w+\s+(?:start|stop|restart)/, message: 'Service manipulation' },
  // User/group management
  { pattern: /\buseradd\b/, message: 'User creation' },
  { pattern: /\buserdel\b/, message: 'User deletion' },
  { pattern: /\bpasswd\b/, message: 'Password change' },
  // Firewall manipulation
  { pattern: /\biptables\b/, message: 'Firewall manipulation' },
  { pattern: /\bnetsh\b/, message: 'Windows firewall/network manipulation' },
  // Format/partition
  { pattern: /\bfdisk\b/, message: 'Disk partitioning' },
  { pattern: /\bparted\b/, message: 'Disk partitioning' },
]

export const bashTool: Tool = {
  name: 'bash',
  description: 'Execute shell commands. Use for file operations, git commands, running scripts, etc.',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
      },
      cwd: {
        type: 'string',
        description: 'Working directory for the command',
      },
    },
    required: ['command'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { command, timeout = 30000, cwd } = input as BashInput

    // Security: Reject null bytes
    if (command.includes('\0')) {
      return {
        content: 'Error: Command contains null bytes',
        is_error: true,
      }
    }

    // Security: Check dangerous patterns
    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          content: `Error: Potentially dangerous command blocked: ${message}`,
          is_error: true,
        }
      }
    }

    return new Promise((resolve) => {
      const workDir = cwd || context.cwd
      const isWindows = process.platform === 'win32'
      const shell = isWindows ? 'cmd' : 'bash'
      const shellArgs = isWindows ? ['/c', command] : ['-c', command]
      const child = spawn(shell, shellArgs, {
        cwd: workDir,
        signal: context.abortSignal,
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      // 超时处理
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        resolve({
          content: `Command timed out after ${timeout}ms\nPartial output:\n${stdout}`,
          is_error: true,
        })
      }, timeout)

      child.on('close', (code) => {
        clearTimeout(timeoutId)
        const output = stdout + (stderr ? `\nStderr:\n${stderr}` : '')
        resolve({
          content: output || '(no output)',
          is_error: code !== 0,
        })
      })

      child.on('error', (error) => {
        clearTimeout(timeoutId)
        resolve({
          content: `Error: ${error.message}`,
          is_error: true,
        })
      })
    })
  },
}
