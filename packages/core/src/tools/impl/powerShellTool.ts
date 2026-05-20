/**
 * PowerShell Tool - Execute PowerShell commands on Windows
 *
 * Mirrors bashTool.ts but uses powershell.exe as the shell,
 * with Windows-specific dangerous pattern detection.
 */

import { spawn } from 'child_process'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface PowerShellInput {
  command: string
  timeout?: number
  cwd?: string
}

/** PowerShell-specific dangerous patterns */
const dangerousPatterns: Array<{ pattern: RegExp; message: string }> = [
  // Recursive force delete
  { pattern: /Remove-Item\s+.*-Recurse.*-Force.*[A-Z]:\\/i, message: 'Recursive force delete of root path' },
  { pattern: /rm\s+.*-r.*-f.*[A-Z]:\\/i, message: 'Recursive force delete of root path' },
  // Fork bomb
  { pattern: /while\s*\(\s*\$true\s*\)/i, message: 'Potential infinite loop (fork bomb pattern)' },
  // Environment exfiltration
  { pattern: /Get-ChildItem\s+Env:/i, message: 'Environment variable enumeration' },
  // Script execution policy bypass
  { pattern: /-ExecutionPolicy\s+Bypass/i, message: 'Execution policy bypass' },
  // Download and execute
  { pattern: /Invoke-WebRequest.*\|\s*Invoke-Expression/i, message: 'Download and execute pattern' },
  { pattern: /iex\s*\(\s*\(?\s*New-Object/i, message: 'Download and execute pattern' },
  // Service manipulation
  { pattern: /Stop-Service\s+-Name/i, message: 'Service manipulation' },
  { pattern: /Start-Service\s+-Name/i, message: 'Service manipulation' },
  // Firewall manipulation
  { pattern: /New-NetFirewallRule/i, message: 'Firewall manipulation' },
  { pattern: /Set-NetFirewallRule/i, message: 'Firewall manipulation' },
  // Registry modification
  { pattern: /New-ItemProperty\s+-Path\s+['"]HKLM/i, message: 'System registry modification' },
  { pattern: /Set-ItemProperty\s+-Path\s+['"]HKLM/i, message: 'System registry modification' },
  // User management
  { pattern: /New-LocalUser/i, message: 'User creation' },
  { pattern: /Remove-LocalUser/i, message: 'User deletion' },
]

export const powerShellTool: Tool = {
  name: 'powershell',
  description: 'Execute PowerShell commands on Windows. Use for file operations, system commands, running scripts, etc.',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The PowerShell command to execute',
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
    const { command, timeout = 30000, cwd } = input as PowerShellInput

    // Only works on Windows
    if (process.platform !== 'win32') {
      return {
        content: 'PowerShell tool is only available on Windows. Use bash instead on this platform.',
        is_error: true,
      }
    }

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

      // Detect PowerShell path: prefer pwsh (PowerShell 7+), fallback to powershell.exe
      const psCommand = 'powershell.exe'
      const psArgs = [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command', command,
      ]

      const child = spawn(psCommand, psArgs, {
        cwd: workDir,
        signal: context.abortSignal,
        env: {
          ...process.env,
          // Prevent profile loading for consistency
          PSModulePath: '',
        },
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      // Timeout handling
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        resolve({
          content: `Command timed out after ${timeout}ms\nPartial output:\n${stdout}`,
          is_error: true,
        })
      }, timeout)

      child.on('close', (code) => {
        clearTimeout(timeoutId)
        // Strip PowerShell decorative output (progress bars, etc.)
        const cleanOutput = stdout
          .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // ANSI escape codes
          .replace(/\r\n/g, '\n')
          .trim()
        const cleanStderr = stderr
          .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
          .replace(/\r\n/g, '\n')
          .trim()

        const output = cleanOutput + (cleanStderr ? `\nStderr:\n${cleanStderr}` : '')
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
