/**
 * Skill and Discovery Tools - Execute skills and search available tools
 */

import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'
import { toolRegistry } from '../registry.js'
import { getConfig, setConfig, listConfig, deleteConfig } from '../../config/configManager.js'

// ---- Skill Tool ----

export interface SkillInput {
  skill_name: string
  input?: string
}

export const skillTool: Tool = {
  name: 'Skill',
  description:
    'Invoke a slash command or skill by name. Skills are predefined workflows that automate common tasks.',
  input_schema: {
    type: 'object' as const,
    properties: {
      skill_name: {
        type: 'string',
        description: 'Name of the skill or slash command to invoke',
      },
      input: {
        type: 'string',
        description: 'Optional input for the skill',
      },
    },
    required: ['skill_name'],
  },

  async execute(input: SkillInput, context: ToolContext): Promise<ToolResult> {
    // Try to find the skill as a registered tool
    const skillTool = toolRegistry.get(input.skill_name)
    if (skillTool) {
      return await skillTool.execute({ prompt: input.input ?? '' }, context)
    }

    return {
      content: [
        {
          type: 'text',
          text: `[Skill invoked: ${input.skill_name}]\n${input.input ?? ''}\n\n[Skill execution delegated to command dispatch layer]`,
        },
      ],
    }
  },
}

// ---- Tool Search ----

export interface ToolSearchInput {
  query: string
}

export const toolSearchTool: Tool = {
  name: 'ToolSearch',
  description:
    'Search available tools by name or capability. Use when you need to discover tools for a specific task.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query for tool names or descriptions',
      },
    },
    required: ['query'],
  },

  async execute(input: ToolSearchInput, context: ToolContext): Promise<ToolResult> {
    const allTools = toolRegistry.getAll()
    const query = input.query.toLowerCase()

    const matches = allTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query)
    )

    if (matches.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `[No tools found matching "${input.query}"]\n\nAvailable tools: ${allTools.map((t) => t.name).join(', ')}`,
          },
        ],
      }
    }

    const result = matches
      .map(
        (tool) =>
          `**${tool.name}**: ${tool.description.slice(0, 120)}${tool.description.length > 120 ? '...' : ''}`
      )
      .join('\n')

    return {
      content: [{ type: 'text', text: `[Tool search results for "${input.query}"]\n\n${result}` }],
    }
  },
}

// ---- Config Tool ----

export interface ConfigInput {
  action: 'get' | 'set' | 'list' | 'delete'
  key?: string
  value?: string
}

export const configTool: Tool = {
  name: 'Config',
  description:
    'Manage configuration settings. Get, set, list, or delete configuration values.',
  input_schema: {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['get', 'set', 'list', 'delete'],
        description: 'The configuration action to perform',
      },
      key: {
        type: 'string',
        description: 'Configuration key (dot-notation supported)',
      },
      value: {
        type: 'string',
        description: 'Configuration value to set (for "set" action)',
      },
    },
    required: ['action'],
  },

  async execute(input: ConfigInput, context: ToolContext): Promise<ToolResult> {
    switch (input.action) {
      case 'get': {
        if (!input.key) {
          return { content: [{ type: 'text', text: '[Error] Key is required for get action' }] }
        }
        const value = await getConfig(input.key)
        return {
          content: [{ type: 'text', text: value !== undefined ? String(value) : `[Key not found: ${input.key}]` }],
        }
      }
      case 'set': {
        if (!input.key || input.value === undefined) {
          return { content: [{ type: 'text', text: '[Error] Key and value are required for set action' }] }
        }
        await setConfig(input.key, input.value)
        return { content: [{ type: 'text', text: `[Set] ${input.key} = ${input.value}` }] }
      }
      case 'list': {
        const config = await listConfig()
        return {
          content: [
            {
              type: 'text',
              text: Object.entries(config)
                .map(([k, v]) => `${k} = ${v}`)
                .join('\n') || '[No configuration entries]',
            },
          ],
        }
      }
      case 'delete': {
        if (!input.key) {
          return { content: [{ type: 'text', text: '[Error] Key is required for delete action' }] }
        }
        const deleted = await deleteConfig(input.key)
        return { content: [{ type: 'text', text: deleted ? `[Deleted] ${input.key}` : `[Key not found: ${input.key}]` }] }
      }
      default:
        return { content: [{ type: 'text', text: `[Unknown action: ${input.action}]` }] }
    }
  },
}