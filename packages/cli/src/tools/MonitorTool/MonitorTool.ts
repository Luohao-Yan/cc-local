import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { spawn, type ChildProcess } from 'child_process'
import { z } from 'zod/v4'
import { logForDebugging } from '../../utils/debug.js'
import { generateTaskId } from '../../Task.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { MONITOR_TOOL_NAME, MONITOR_TOOL_PROMPT } from './prompt.js'
import type { MonitorMcpTaskState } from '../../tasks/MonitorMcpTask/MonitorMcpTask.js'

const inputSchema = z.strictObject({
  command: z.string().describe('The command to execute and monitor'),
  description: z
    .string()
    .optional()
    .describe('Clear, concise description of what this command monitors'),
})

export const MonitorTool = buildTool({
  name: MONITOR_TOOL_NAME,
  maxResultSizeChars: 64_000,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
  get inputSchema() {
    return inputSchema
  },
  async description() {
    return MONITOR_TOOL_PROMPT
  },
  async prompt() {
    return MONITOR_TOOL_PROMPT
  },
  renderToolUseMessage(input) {
    const desc = input.description ? ` — ${input.description}` : ''
    return `${input.command}${desc}`
  },
  mapToolResultToToolResultBlockParam(
    _output: z.infer<typeof inputSchema>,
    toolUseID: string,
  ): ToolResultBlockParam {
    return { tool_use_id: toolUseID, type: 'tool_result', content: '' }
  },
  async call(input, context) {
    const { command, description } = input
    const addNotification = context.addNotification

    logForDebugging(`MonitorTool: spawning command: ${command}`)

    const childProcess: ChildProcess = spawn(command, [], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    // Generate a proper task ID with the monitor_mcp prefix
    const taskId = generateTaskId('monitor_mcp')
    const taskState: MonitorMcpTaskState = {
      id: taskId,
      type: 'monitor_mcp',
      status: 'running',
      description: description ?? command,
      startTime: Date.now(),
      outputFile: '',
      outputOffset: 0,
      notified: false,
      childProcess,
      agentId: context.agentId,
    }

    context.setAppState(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: taskState,
      },
    }))

    // Stream stdout lines as notifications
    if (childProcess.stdout && addNotification) {
      let buffer = ''
      childProcess.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.trim()) {
            addNotification({
              key: `monitor-${taskId}`,
              priority: 'low',
              timeoutMs: 4000,
              text: `[Monitor] ${line.trim()}`,
            })
          }
        }
      })
    }

    // Log stderr but don't generate notifications for it
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (chunk: Buffer) => {
        logForDebugging(`MonitorTool stderr: ${chunk.toString().trim()}`)
      })
    }

    // Handle process exit
    childProcess.on('exit', (code, signal) => {
      logForDebugging(
        `MonitorTool: process ${childProcess.pid} exited with code=${code} signal=${signal}`,
      )
      context.setAppState(prev => {
        const existing = prev.tasks?.[taskId] as MonitorMcpTaskState | undefined
        if (!existing) return prev
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [taskId]: {
              ...existing,
              status: 'completed',
              endTime: Date.now(),
            },
          },
        }
      })
      if (addNotification) {
        addNotification({
          key: `monitor-exit-${taskId}`,
          priority: 'medium',
          timeoutMs: 6000,
          text: `[Monitor] ${command} exited (code ${code ?? signal ?? 'unknown'})`,
        })
      }
    })

    childProcess.on('error', err => {
      logForDebugging(`MonitorTool: process error: ${err.message}`)
    })

    return {
      data: {
        pid: childProcess.pid,
        command,
        status: 'monitoring',
      },
    }
  },
} satisfies ToolDef<typeof inputSchema, { pid: number | undefined; command: string; status: string }>)
