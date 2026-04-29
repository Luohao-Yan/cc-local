/**
 * Plan Mode Tools - Enter and exit planning mode
 *
 * Planning mode allows the assistant to create detailed implementation
 * plans before executing changes, giving users a chance to review.
 */

import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

// ---- Enter Plan Mode ----

export interface EnterPlanModeInput {
  plan: string
}

export const enterPlanModeTool: Tool = {
  name: 'EnterPlanMode',
  description:
    'Enter planning mode. Use this when the task is complex enough to warrant creating a detailed plan before making changes. The user will review and approve the plan before execution begins.',
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

  async call(input: EnterPlanModeInput, context: ToolContext): Promise<ToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: `[Planning mode entered]\n\n${input.plan}\n\nI'll create a detailed implementation plan. Use ExitPlanMode when ready to proceed.`,
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
    'Exit planning mode and proceed with implementation. Provide the finalized plan that was approved.',
  input_schema: {
    type: 'object' as const,
    properties: {
      plan: {
        type: 'string',
        description: 'The finalized plan to execute',
      },
    },
    required: ['plan'],
  },

  async call(input: ExitPlanModeInput, context: ToolContext): Promise<ToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: `[Planning mode exited, proceeding with implementation]\n\n${input.plan}`,
        },
      ],
    }
  },
}