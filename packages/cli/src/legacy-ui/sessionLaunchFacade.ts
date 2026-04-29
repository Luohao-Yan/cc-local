import type { LegacyAppShellRuntime } from './appShellAdapter.js'
import {
  launchLegacyReplFromContext,
  type LegacyRenderAndRun,
} from './launchReplBridge.js'
import {
  buildLegacyNormalSessionLaunchContext,
  buildLegacyResumeSessionLaunchContext,
  type LegacyNormalSessionLaunchInput,
  type LegacyResumeSessionLaunchInput,
} from './sessionLaunchAdapters.js'

export interface LegacySessionFacadeOptions<TRoot = unknown> {
  root: TRoot
  renderAndRun: LegacyRenderAndRun<TRoot>
  loadRuntime?: () => Promise<LegacyAppShellRuntime>
}

export async function launchLegacyNormalSession<
  TRoot,
  TInitialState,
  TStats = unknown,
  TFpsMetrics = unknown,
  TCommand = unknown,
  TTool = unknown,
  TMcpClient = unknown,
  TAgentDefinition = unknown,
  TThinkingConfig = unknown,
  TMessage = unknown,
  TDynamicMcpConfig = unknown,
>(
  options: LegacySessionFacadeOptions<TRoot> &
    LegacyNormalSessionLaunchInput<
      TInitialState,
      TStats,
      TFpsMetrics,
      TCommand,
      TTool,
      TMcpClient,
      TAgentDefinition,
      TThinkingConfig,
      TMessage,
      TDynamicMcpConfig
    >,
): Promise<void> {
  const { root, renderAndRun, loadRuntime, ...input } = options
  const context = buildLegacyNormalSessionLaunchContext(input)

  await launchLegacyReplFromContext({
    root,
    context,
    renderAndRun,
    loadRuntime,
  })
}

export async function launchLegacyResumeSession<
  TRoot,
  TInitialState,
  TStats = unknown,
  TFpsMetrics = unknown,
  TCommand = unknown,
  TTool = unknown,
  TMcpClient = unknown,
  TAgentDefinition = unknown,
  TThinkingConfig = unknown,
  TMessage = unknown,
  TDynamicMcpConfig = unknown,
  TFileHistorySnapshot = unknown,
  TContentReplacement = unknown,
  TAgentColor = unknown,
>(
  options: LegacySessionFacadeOptions<TRoot> &
    LegacyResumeSessionLaunchInput<
      TInitialState,
      TStats,
      TFpsMetrics,
      TCommand,
      TTool,
      TMcpClient,
      TAgentDefinition,
      TThinkingConfig,
      TMessage,
      TDynamicMcpConfig,
      TFileHistorySnapshot,
      TContentReplacement,
      TAgentColor
    >,
): Promise<void> {
  const { root, renderAndRun, loadRuntime, ...input } = options
  const context = buildLegacyResumeSessionLaunchContext(input)

  await launchLegacyReplFromContext({
    root,
    context,
    renderAndRun,
    loadRuntime,
  })
}
