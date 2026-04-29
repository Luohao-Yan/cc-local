import type { Command } from '../types/command.js'
import type { MCPServerConnection } from '../services/mcp/types.js'

export async function fetchMcpSkillsForClient(
  _client: MCPServerConnection,
): Promise<Command[]> {
  return []
}
