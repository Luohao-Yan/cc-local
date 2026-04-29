import {
  loadLegacyAppShellRuntime,
  type LegacyAppShellRuntime,
} from '../legacy-ui/appShellAdapter.js'
import {
  launchLegacyReplFromContext,
  type LegacyRenderAndRun,
} from '../legacy-ui/launchReplBridge.js'
import {
  buildLegacyLaunchContext,
  type LegacyLaunchContext,
  type LegacyAppShellProps,
  type LegacyReplBaseConfig,
  type LegacyReplOverrides,
} from '../legacy-ui/launchContextBuilder.js'

export interface LegacyBridgeReplOptions {
  debug?: boolean
  resumeData?: {
    initialState: unknown
    messages: unknown[]
    fileHistorySnapshots?: unknown[]
    contentReplacements?: unknown[]
    agentName?: string
    agentColor?: unknown
    restoredAgentDef?: unknown
  }
}

function buildBridgeLaunchContext(
  options: LegacyBridgeReplOptions,
): LegacyLaunchContext {
  const appProps: LegacyAppShellProps<unknown> = {
    getFpsMetrics: () => undefined,
    initialState: {},
  }

  const replBase: LegacyReplBaseConfig = {
    debug: options.debug ?? false,
    commands: [],
    initialTools: [],
    mcpClients: [],
    thinkingConfig: {},
  }

  const replOverrides: LegacyReplOverrides = options.resumeData
    ? {
        initialMessages: options.resumeData.messages,
        initialFileHistorySnapshots: options.resumeData.fileHistorySnapshots,
        initialContentReplacements: options.resumeData.contentReplacements,
        initialAgentName: options.resumeData.agentName,
        initialAgentColor: options.resumeData.agentColor,
      }
    : {}

  return buildLegacyLaunchContext({
    getFpsMetrics: () => undefined,
    initialState: {},
    replBase,
    replOverrides,
  })
}

export async function renderLegacyBridgeRepl(
  options: LegacyBridgeReplOptions = {},
  loadRuntime: () => Promise<LegacyAppShellRuntime> = loadLegacyAppShellRuntime,
): Promise<void> {
  const runtime = await loadRuntime()

  if (typeof runtime.launchRepl !== 'function') {
    throw new TypeError('Legacy UI runtime did not expose a launchRepl function.')
  }

  if (typeof runtime.inkRender !== 'function') {
    throw new TypeError('Legacy UI runtime did not expose an inkRender function.')
  }

  const context = buildBridgeLaunchContext(options)

  const renderAndRun: LegacyRenderAndRun<unknown> = async (root, element) => {
    await (runtime.inkRender as Function)(element)
  }

  await runtime.launchRepl(undefined, context.appProps, context.replProps, renderAndRun)
}
