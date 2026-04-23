import type { Tool, ToolResult } from '@cclocal/shared'

async function getMcpManager() {
  const module = await import('../../mcp/MCPManager.js')
  return module.mcpManager
}

function toErrorResult(error: unknown): ToolResult {
  return {
    content: error instanceof Error ? error.message : String(error),
    is_error: true,
  }
}

export const mcpCompatTool: Tool = {
  name: 'mcp',
  description: 'Call a tool on a connected MCP server by server and tool name.',
  input_schema: {
    type: 'object',
    properties: {
      server: { type: 'string', description: 'MCP server name.' },
      tool: { type: 'string', description: 'MCP tool name on that server.' },
      arguments: { type: 'object', description: 'Arguments to pass to the MCP tool.' },
    },
    required: ['server', 'tool'],
  },
  async execute(input: unknown): Promise<ToolResult> {
    const { server, tool, arguments: args = {} } = input as {
      server?: string
      tool?: string
      arguments?: unknown
    }
    if (!server || !tool) {
      return {
        content: 'Error: server and tool are required',
        is_error: true,
      }
    }
    try {
      return await (await getMcpManager()).callTool(server, tool, args)
    } catch (error) {
      return toErrorResult(error)
    }
  },
}

export const readMcpResourceTool: Tool = {
  name: 'ReadMcpResourceTool',
  description: 'Read a resource URI from a connected MCP server.',
  input_schema: {
    type: 'object',
    properties: {
      server: { type: 'string', description: 'MCP server name.' },
      uri: { type: 'string', description: 'Resource URI to read.' },
    },
    required: ['server', 'uri'],
  },
  async execute(input: unknown): Promise<ToolResult> {
    const { server, uri } = input as { server?: string; uri?: string }
    if (!server || !uri) {
      return {
        content: 'Error: server and uri are required',
        is_error: true,
      }
    }
    try {
      return await (await getMcpManager()).readResource(server, uri)
    } catch (error) {
      return toErrorResult(error)
    }
  },
}
