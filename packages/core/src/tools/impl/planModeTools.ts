/**
 * Plan Mode Tools - Enter and exit planning mode
 *
 * Planning mode allows the assistant to create detailed implementation
 * plans before executing changes, giving users a chance to review.
 *
 * In plan mode, the available tool set is restricted to read-only tools
 * plus the ExitPlanMode tool. This prevents accidental execution
 * during the planning phase.
 */

import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

/** Tools allowed in plan mode (read-only + planning) */
const PLAN_MODE_TOOLS = new Set([
  'file_read',
  'glob',
  'grep',
  'web_search',
  'web_fetch',
  'AskUserQuestion',
  'ExitPlanMode',
  'TodoWrite',
  'ToolSearch',
  'ListMcpResources',
  'ReadMcpResourceTool',
  'SendMessage',
])

// ---- Enter Plan Mode ----

export interface EnterPlanModeInput {
  plan: string
}

export const enterPlanModeTool: Tool = {
  name: 'EnterPlanMode',
  description:
    'Enter planning mode. In this mode, you can only use read-only tools (Read, Grep, Glob, WebSearch, WebFetch) plus ExitPlanMode. The user will review your plan before you proceed with implementation. Use this for complex tasks that benefit from a structured approach.',
  input_schema: {
    type: 'object' as const,
    properties: {
      plan: {
        type: 'string',
        description: 'The initial plan or task description to plan for',
      },
    },
    required: ['plan'],
  },

  async execute(input: EnterPlanModeInput, context: ToolContext): Promise<ToolResult> {
    // Notify the engine to switch to plan mode
    context.onPlanModeChange?.(true, input.plan)

    return {
      content: [
        {
          type: 'text',
          text: `[Planning mode entered]\n\n${input.plan}\n\nI will now analyze the task and create a detailed implementation plan. Only read-only tools are available until the plan is approved.\n\nUse ExitPlanMode when you're ready to present the finalized plan for approval.`,
        },
      ],
    }
  },
}

// ---- Exit Plan Mode ----

export interface ExitPlanModeInput {
  plan: string
}

export const exitPlanModeTool: Tool = {
  name: 'ExitPlanMode',
  description:
    'Exit planning mode and present the finalized plan. The user will review the plan before execution begins. If they approve, all tools become available again for implementation.',
  input_schema: {
    type: 'object' as const,
    properties: {
      plan: {
        type: 'string',
        description: 'The finalized plan to present for approval',
      },
    },
    required: ['plan'],
  },

  async execute(input: ExitPlanModeInput, context: ToolContext): Promise<ToolResult> {
    // Notify the engine to switch out of plan mode
    context.onPlanModeChange?.(false, input.plan)

    return {
      content: [
        {
          type: 'text',
          text: `[Planning mode exited — plan submitted for review]\n\n${input.plan}\n\nAwaiting user approval to proceed with implementation.`,
        },
      ],
    }
  },
}

/**
 * Filter tools to only allow plan-mode-safe tools.
 * Called by QueryEngine when plan mode is active.
 */
export function filterToolsForPlanMode(tools: Tool[]): Tool[] {
  return tools.filter((tool) => PLAN_MODE_TOOLS.has(tool.name))
}

/**
 * Check if a tool is allowed in plan mode.
 */
export function isToolAllowedInPlanMode(toolName: string): boolean {
  return PLAN_MODE_TOOLS.has(toolName)
}
