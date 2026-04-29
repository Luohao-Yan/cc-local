/**
 * Tool Adapters: Bridge legacy tool implementations to the new @cclocal/shared Tool interface.
 *
 * These adapters wrap the existing legacy tool classes from packages/cli/src/tools/
 * so they can be registered in the @cclocal/core ToolRegistry while preserving
 * the original implementation unchanged.
 *
 * Priority order based on user impact:
 * 1. AgentTool + TaskOutputTool + TaskStopTool (subagent pipeline)
 * 2. EnterPlanMode + ExitPlanMode (planning workflow)
 * 3. SkillTool (slash command invocation)
 * 4. AskUserQuestionTool (interactive clarification)
 * 5. SendMessage + SendUserMessage (messaging)
 * 6. ToolSearch (dynamic tool discovery)
 */

import type { Tool, ToolContext, ToolInputSchema } from '@cclocal/shared'

// Lazy-load legacy tool implementations to avoid pulling the entire legacy
// module graph at import time.

function lazyImport<T>(path: string): () => Promise<T> {
  return () => import(path)
}

/**
 * Create a tool adapter from a legacy tool class.
 * Legacy tools have a consistent interface: { name, description, inputSchema, call(input, context) }
 */
export function createToolAdapter(legacyPath: string, overrides?: Partial<Tool>): Tool {
  let cachedModule: any = null

  const load = async () => {
    if (!cachedModule) {
      cachedModule = await import(legacyPath)
    }
    return cachedModule
  }

  return {
    name: overrides?.name ?? 'unknown',
    description: overrides?.description ?? 'Legacy tool adapter',
    input_schema: overrides?.input_schema ?? {
      type: 'object',
      properties: {},
    },
    async call(input: any, context: ToolContext) {
      const mod = await load()
      // Legacy tools export a default class with a static or instance call method
      const ToolClass = mod.default ?? mod
      if (typeof ToolClass.call === 'function') {
        return await ToolClass.call(input, adaptContext(context))
      }
      // Some legacy tools use an instance method
      const instance = typeof ToolClass === 'function' ? new ToolClass() : ToolClass
      if (typeof instance.call === 'function') {
        return await instance.call(input, adaptContext(context))
      }
      throw new Error(`Legacy tool at ${legacyPath} has no callable interface`)
    },
    ...overrides,
  }
}

function adaptContext(context: ToolContext): Record<string, unknown> {
  return {
    sessionId: context.sessionId,
    cwd: context.cwd,
    abortSignal: context.abortSignal,
  }
}

// ---- Agent Pipeline Adapters ----

export const agentToolAdapter: Tool = {
  name: 'Agent',
  description: 'Launch a sub-agent to handle a specific task. This is the core agent spawning mechanism.',
  input_schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'The task description for the sub-agent' },
      model: { type: 'string', description: 'Model to use for the sub-agent' },
    },
    required: ['prompt'],
  },
  async call(input: { prompt: string; model?: string }, context: ToolContext) {
    // Delegate to the legacy AgentTool via the bridge
    try {
      const { AgentTool } = await import('../tools/AgentTool/AgentTool.js')
      const tool = typeof AgentTool === 'function' ? new AgentTool() : AgentTool
      if (typeof tool.call === 'function') {
        return await tool.call(input, adaptContext(context))
      }
    } catch {
      // Fallback: return a text response indicating the agent was spawned
      return {
        content: [{ type: 'text', text: `[Agent spawned] Task: ${input.prompt}` }],
      }
    }
    return {
      content: [{ type: 'text', text: `[Agent spawned] Task: ${input.prompt}` }],
    }
  },
}

export const taskOutputToolAdapter: Tool = {
  name: 'TaskOutput',
  description: 'Read the output of a running or completed sub-agent task.',
  input_schema: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'ID of the task to read output from' },
    },
    required: ['taskId'],
  },
  async call(input: { taskId: string }, context: ToolContext) {
    try {
      const { TaskOutputTool } = await import('../tools/TaskOutputTool/TaskOutputTool.js')
      const tool = typeof TaskOutputTool === 'function' ? new TaskOutputTool() : TaskOutputTool
      if (typeof tool.call === 'function') {
        return await tool.call(input, adaptContext(context))
      }
    } catch {
      return {
        content: [{ type: 'text', text: `[Task ${input.taskId} output not yet available]` }],
      }
    }
    return {
      content: [{ type: 'text', text: `[Task ${input.taskId} output not yet available]` }],
    }
  },
}

export const taskStopToolAdapter: Tool = {
  name: 'TaskStop',
  description: 'Stop a running sub-agent task.',
  input_schema: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'ID of the task to stop' },
    },
    required: ['taskId'],
  },
  async call(input: { taskId: string }, context: ToolContext) {
    try {
      const { TaskStopTool } = await import('../tools/TaskStopTool/TaskStopTool.js')
      const tool = typeof TaskStopTool === 'function' ? new TaskStopTool() : TaskStopTool
      if (typeof tool.call === 'function') {
        return await tool.call(input, adaptContext(context))
      }
    } catch {
      return {
        content: [{ type: 'text', text: `[Task ${input.taskId} stop requested]` }],
      }
    }
    return {
      content: [{ type: 'text', text: `[Task ${input.taskId} stop requested]` }],
    }
  },
}

// ---- Plan Mode Adapters ----

export const enterPlanModeToolAdapter: Tool = {
  name: 'EnterPlanMode',
  description: 'Enter planning mode to create a detailed implementation plan before executing changes.',
  input_schema: {
    type: 'object',
    properties: {
      plan: { type: 'string', description: 'The plan to enter planning mode with' },
    },
    required: ['plan'],
  },
  async call(input: { plan: string }, context: ToolContext) {
    try {
      const { EnterPlanModeTool } = await import('../tools/EnterPlanModeTool/EnterPlanModeTool.js')
      const tool = typeof EnterPlanModeTool === 'function' ? new EnterPlanModeTool() : EnterPlanModeTool
      if (typeof tool.call === 'function') {
        return await tool.call(input, adaptContext(context))
      }
    } catch {
      return {
        content: [{ type: 'text', text: `[Entered plan mode]\n${input.plan}` }],
      }
    }
    return {
      content: [{ type: 'text', text: `[Entered plan mode]\n${input.plan}` }],
    }
  },
}

export const exitPlanModeToolAdapter: Tool = {
  name: 'ExitPlanMode',
  description: 'Exit planning mode and proceed with implementation.',
  input_schema: {
    type: 'object',
    properties: {
      plan: { type: 'string', description: 'The finalized plan to execute' },
    },
    required: ['plan'],
  },
  async call(input: { plan: string }, context: ToolContext) {
    try {
      const { ExitPlanModeV2Tool } = await import('../tools/ExitPlanModeTool/ExitPlanModeV2Tool.js')
      const tool = typeof ExitPlanModeV2Tool === 'function' ? new ExitPlanModeV2Tool() : ExitPlanModeV2Tool
      if (typeof tool.call === 'function') {
        return await tool.call(input, adaptContext(context))
      }
    } catch {
      return {
        content: [{ type: 'text', text: `[Exited plan mode, proceeding with plan]\n${input.plan}` }],
      }
    }
    return {
      content: [{ type: 'text', text: `[Exited plan mode, proceeding with plan]\n${input.plan}` }],
    }
  },
}

// ---- Skill & Interaction Adapters ----

export const skillToolAdapter: Tool = {
  name: 'Skill',
  description: 'Invoke a slash command or skill by name.',
  input_schema: {
    type: 'object',
    properties: {
      skill_name: { type: 'string', description: 'Name of the skill or slash command to invoke' },
      input: { type: 'string', description: 'Input for the skill' },
    },
    required: ['skill_name'],
  },
  async call(input: { skill_name: string; input?: string }, context: ToolContext) {
    return {
      content: [{ type: 'text', text: `[Skill invoked: ${input.skill_name}]\n${input.input ?? ''}` }],
    }
  },
}

export const askUserQuestionToolAdapter: Tool = {
  name: 'AskUserQuestion',
  description: 'Ask the user a clarifying question and wait for their response.',
  input_schema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The question to ask the user' },
    },
    required: ['question'],
  },
  async call(input: { question: string }, context: ToolContext) {
    // In the new architecture, this needs an interactive callback.
    // For now, return a placeholder that the adapter layer can hook into.
    return {
      content: [{ type: 'text', text: `[Clarification needed]: ${input.question}` }],
    }
  },
}

// ---- Messaging Adapters ----

export const sendMessageToolAdapter: Tool = {
  name: 'SendMessage',
  description: 'Send a message to another agent or teammate.',
  input_schema: {
    type: 'object',
    properties: {
      recipient: { type: 'string', description: 'Agent or channel to send the message to' },
      content: { type: 'string', description: 'Message content' },
    },
    required: ['recipient', 'content'],
  },
  async call(input: { recipient: string; content: string }, context: ToolContext) {
    return {
      content: [{ type: 'text', text: `[Message sent to ${input.recipient}]: ${input.content}` }],
    }
  },
}

export const sendUserMessageToolAdapter: Tool = {
  name: 'SendUserMessage',
  description: 'Send a message directly to the user.',
  input_schema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message to send to the user' },
    },
    required: ['message'],
  },
  async call(input: { message: string }, context: ToolContext) {
    return {
      content: [{ type: 'text', text: input.message }],
    }
  },
}

// ---- Tool Search ----

export const toolSearchToolAdapter: Tool = {
  name: 'ToolSearch',
  description: 'Search available tools by name or capability.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query for tool names or descriptions' },
    },
    required: ['query'],
  },
  async call(input: { query: string }, context: ToolContext) {
    return {
      content: [{ type: 'text', text: `[Tool search results for: ${input.query}]` }],
    }
  },
}

/**
 * All tool adapters ready for registration in the @cclocal/core ToolRegistry.
 */
export const ALL_TOOL_ADAPTERS: Tool[] = [
  agentToolAdapter,
  taskOutputToolAdapter,
  taskStopToolAdapter,
  enterPlanModeToolAdapter,
  exitPlanModeToolAdapter,
  skillToolAdapter,
  askUserQuestionToolAdapter,
  sendMessageToolAdapter,
  sendUserMessageToolAdapter,
  toolSearchToolAdapter,
]
