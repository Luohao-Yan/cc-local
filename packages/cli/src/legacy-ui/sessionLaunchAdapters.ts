import {
  buildLegacyLaunchContext,
  type LegacyLaunchContext,
  type LegacyReplBaseConfig,
} from './launchContextBuilder.js'

export interface LegacyNormalSessionLaunchInput<
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
> {
  getFpsMetrics: () => TFpsMetrics | undefined
  stats?: TStats
  initialState: TInitialState
  replBase: LegacyReplBaseConfig<
    TCommand,
    TTool,
    TMcpClient,
    TAgentDefinition,
    TThinkingConfig,
    TMessage,
    TDynamicMcpConfig
  >
  hookMessages?: TMessage[]
  hooksPromise?: Promise<unknown[]>
  deepLinkBanner?: TMessage | null
}

export interface LegacyResumeData<
  TInitialState,
  TMessage = unknown,
  TFileHistorySnapshot = unknown,
  TContentReplacement = unknown,
  TAgentDefinition = unknown,
  TAgentColor = unknown,
> {
  initialState: TInitialState
  messages: TMessage[]
  fileHistorySnapshots?: TFileHistorySnapshot[]
  contentReplacements?: TContentReplacement[]
  agentName?: string
  agentColor?: TAgentColor
  restoredAgentDef?: TAgentDefinition
}

export interface LegacyResumeSessionLaunchInput<
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
> {
  getFpsMetrics: () => TFpsMetrics | undefined
  stats?: TStats
  replBase: LegacyReplBaseConfig<
    TCommand,
    TTool,
    TMcpClient,
    TAgentDefinition,
    TThinkingConfig,
    TMessage,
    TDynamicMcpConfig
  >
  resumeData: LegacyResumeData<
    TInitialState,
    TMessage,
    TFileHistorySnapshot,
    TContentReplacement,
    TAgentDefinition,
    TAgentColor
  >
  fallbackMainThreadAgentDefinition?: TAgentDefinition
}

export function buildLegacyNormalSessionLaunchContext<
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
  input: LegacyNormalSessionLaunchInput<
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
): LegacyLaunchContext<
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
> {
  const hookMessages = input.hookMessages ?? []
  const initialMessages = input.deepLinkBanner
    ? [input.deepLinkBanner, ...hookMessages]
    : hookMessages.length > 0
      ? hookMessages
      : undefined
  const pendingHookMessages = input.hooksPromise && hookMessages.length === 0
    ? input.hooksPromise
    : undefined

  return buildLegacyLaunchContext({
    getFpsMetrics: input.getFpsMetrics,
    stats: input.stats,
    initialState: input.initialState,
    replBase: input.replBase,
    replOverrides: {
      initialMessages,
      pendingHookMessages,
    },
  })
}

export function buildLegacyResumeSessionLaunchContext<
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
  input: LegacyResumeSessionLaunchInput<
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
): LegacyLaunchContext<
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
> {
  const mainThreadAgentDefinition =
    input.resumeData.restoredAgentDef ??
    input.fallbackMainThreadAgentDefinition ??
    input.replBase.mainThreadAgentDefinition

  return buildLegacyLaunchContext({
    getFpsMetrics: input.getFpsMetrics,
    stats: input.stats,
    initialState: input.resumeData.initialState,
    replBase: {
      ...input.replBase,
      mainThreadAgentDefinition,
    },
    replOverrides: {
      initialMessages: input.resumeData.messages,
      initialFileHistorySnapshots: input.resumeData.fileHistorySnapshots,
      initialContentReplacements: input.resumeData.contentReplacements,
      initialAgentName: input.resumeData.agentName,
      initialAgentColor: input.resumeData.agentColor,
    },
  })
}
