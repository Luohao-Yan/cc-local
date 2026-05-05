/**
 * Tool Adapters: Bridge legacy tool implementations to the new @cclocal/shared Tool interface.
 *
 * The `createToolAdapter` factory wraps a legacy tool module in the new Tool interface
 * via lazy import. This is the extension point for future bridge tools that don't have
 * a native core implementation.
 *
 * The 10 original adapters (Agent, TaskOutput, TaskStop, EnterPlanMode, ExitPlanMode,
 * Skill, AskUserQuestion, SendMessage, SendUserMessage, ToolSearch) have been superseded
 * by native implementations in @cclocal/core. They were removed to avoid dead code.
 */

import type { Tool, ToolContext, ToolInputSchema } from '@cclocal/shared'

/**
 * Create a tool adapter from a legacy tool module path.
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
    async execute(input: any, context: ToolContext) {
      const mod = await load()
      const ToolClass = mod.default ?? mod
      if (typeof ToolClass.call === 'function') {
        return await ToolClass.call(input, adaptContext(context))
      }
      const instance = typeof ToolClass === 'function' ? new ToolClass() : ToolClass
      if (typeof instance.call === 'function') {
        return await instance.call(input, adaptContext(context))
      }
      if (typeof ToolClass.execute === 'function') {
        return await ToolClass.execute(input, adaptContext(context))
      }
      const inst2 = typeof ToolClass === 'function' ? new ToolClass() : ToolClass
      if (typeof inst2.execute === 'function') {
        return await inst2.execute(input, adaptContext(context))
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

/**
 * Bridge adapters for registering legacy CLI tools into the core ToolRegistry.
 * Currently empty — all tools have native core implementations.
 * Add entries via `createToolAdapter()` if a legacy tool needs bridging in the future.
 */
export const ALL_TOOL_ADAPTERS: Tool[] = []
