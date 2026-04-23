import { spawn } from 'child_process'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

function textTool(name: string, description: string, content: string): Tool {
  return {
    name,
    description,
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Optional instruction or context.' },
      },
    },
    async execute(): Promise<ToolResult> {
      return { content }
    },
  }
}

async function runCommand(command: string, cwd: string, timeout = 30_000): Promise<ToolResult> {
  return await new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({
        content: `Command timed out after ${timeout}ms\n${output.trim()}`,
        is_error: true,
      })
    }, timeout)
    child.stdout.on('data', (chunk) => {
      output += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      output += String(chunk)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({
        content: error.message,
        is_error: true,
      })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        content: output.trim() || '(no output)',
        is_error: code !== 0,
      })
    })
  })
}

export const replTool: Tool = {
  name: 'REPL',
  description: 'Run a short shell command and return its output. Compatibility replacement for the legacy REPL tool.',
  input_schema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to run.' },
    },
    required: ['command'],
  },
  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { command } = input as { command?: string }
    if (!command) {
      return { content: 'Error: command is required', is_error: true }
    }
    return await runCommand(command, context.cwd)
  },
}

export const monitorTool: Tool = {
  name: 'Monitor',
  description: 'Return lightweight process and workspace health information.',
  input_schema: {
    type: 'object',
    properties: {},
  },
  async execute(_input: unknown, context: ToolContext): Promise<ToolResult> {
    return {
      content: [
        'Monitor:',
        `cwd: ${context.cwd}`,
        `pid: ${process.pid}`,
        `platform: ${process.platform}`,
        `node: ${process.version}`,
        `memory.rss: ${process.memoryUsage().rss}`,
      ].join('\n'),
    }
  },
}

export const verifyPlanExecutionTool = textTool(
  'VerifyPlanExecution',
  'Check whether a completed plan has supporting verification evidence.',
  [
    'Verification compatibility result:',
    '- Review the completed plan items against the final diff.',
    '- Run the relevant tests or build commands.',
    '- Treat missing command evidence as incomplete verification.',
  ].join('\n')
)

export const suggestBackgroundPrTool = textTool(
  'SuggestBackgroundPR',
  'Suggest whether the current work should be turned into a background PR.',
  'Background PR suggestion: inspect the current diff, run tests, then create a branch and PR when the change is cohesive.'
)

export const remoteSkillTool = textTool(
  'remote_skill',
  'Route remote skill execution through packages MCP/plugin integrations.',
  'Remote skills are handled through MCP/plugin integrations in packages mode. Register the remote provider as an MCP server, connect it, then use its synchronized tools from the QueryEngine tool pool.'
)

export const inProcessTool = textTool(
  'in-process',
  'Represent in-process agent execution through the packages QueryEngine.',
  'In-process agent execution is represented by the packages QueryEngine and MCP/tool registry. Use dynamic MCP tools or native task tools for multi-agent style workflows.'
)

export const shipAuditTool = textTool(
  'ship-audit',
  'Run a lightweight shipping audit checklist.',
  [
    'Ship audit checklist:',
    '- Confirm tests/build pass.',
    '- Confirm user-facing docs are updated if behavior changed.',
    '- Confirm no unrelated files were reverted.',
    '- Confirm migration/parity notes are current.',
  ].join('\n')
)

export const migrationReviewTool = textTool(
  'migration-review',
  'Run a lightweight migration review checklist.',
  [
    'Migration review checklist:',
    '- Compare old src behavior with packages behavior.',
    '- Verify CLI, REST, MCP, and REPL paths.',
    '- Keep --legacy available until parity is proven for the path.',
  ].join('\n')
)

export const legacyCompatibilityTools = [
  replTool,
  monitorTool,
  verifyPlanExecutionTool,
  suggestBackgroundPrTool,
  remoteSkillTool,
  inProcessTool,
  shipAuditTool,
  migrationReviewTool,
]
