export interface LegacyAppShellProps<
  TInitialState = unknown,
  TStats = unknown,
  TFpsMetrics = unknown,
> {
  getFpsMetrics: () => TFpsMetrics | undefined
  stats?: TStats
  initialState: TInitialState
}

export interface LegacyReplBaseConfig<
  TCommand = unknown,
  TTool = unknown,
  TMcpClient = unknown,
  TAgentDefinition = unknown,
  TThinkingConfig = unknown,
  TMessage = unknown,
  TDynamicMcpConfig = unknown,
> {
  debug: boolean
  commands: TCommand[]
  initialTools: TTool[]
  mcpClients: TMcpClient[]
  autoConnectIdeFlag?: boolean
  mainThreadAgentDefinition?: TAgentDefinition
  disableSlashCommands?: boolean
  dynamicMcpConfig?: TDynamicMcpConfig
  strictMcpConfig?: boolean
  systemPrompt?: string
  appendSystemPrompt?: string
  taskListId?: string
  thinkingConfig: TThinkingConfig
  onTurnComplete?: (messages: TMessage[]) => void | Promise<void>
}

export interface LegacyReplOverrides<
  TMessage = unknown,
  TFileHistorySnapshot = unknown,
  TContentReplacement = unknown,
  TAgentColor = unknown,
  TRemoteSessionConfig = unknown,
  TDirectConnectConfig = unknown,
  TSSHSession = unknown,
> {
  initialMessages?: TMessage[]
  pendingHookMessages?: Promise<unknown[]>
  initialFileHistorySnapshots?: TFileHistorySnapshot[]
  initialContentReplacements?: TContentReplacement[]
  initialAgentName?: string
  initialAgentColor?: TAgentColor
  remoteSessionConfig?: TRemoteSessionConfig
  directConnectConfig?: TDirectConnectConfig
  sshSession?: TSSHSession
  disabled?: boolean
}

export interface LegacyLaunchContext<
  TInitialState = unknown,
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
  TRemoteSessionConfig = unknown,
  TDirectConnectConfig = unknown,
  TSSHSession = unknown,
> {
  appProps: LegacyAppShellProps<TInitialState, TStats, TFpsMetrics>
  replProps: LegacyReplBaseConfig<
    TCommand,
    TTool,
    TMcpClient,
    TAgentDefinition,
    TThinkingConfig,
    TMessage,
    TDynamicMcpConfig
  > &
    LegacyReplOverrides<
      TMessage,
      TFileHistorySnapshot,
      TContentReplacement,
      TAgentColor,
      TRemoteSessionConfig,
      TDirectConnectConfig,
      TSSHSession
    >
}

export function buildLegacyAppShellProps<
  TInitialState,
  TStats = unknown,
  TFpsMetrics = unknown,
>(input: {
  getFpsMetrics: () => TFpsMetrics | undefined
  stats?: TStats
  initialState: TInitialState
}): LegacyAppShellProps<TInitialState, TStats, TFpsMetrics> {
  return {
    getFpsMetrics: input.getFpsMetrics,
    stats: input.stats,
    initialState: input.initialState,
  }
}

export function buildLegacyReplProps<
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
  TRemoteSessionConfig = unknown,
  TDirectConnectConfig = unknown,
  TSSHSession = unknown,
>(
  base: LegacyReplBaseConfig<
    TCommand,
    TTool,
    TMcpClient,
    TAgentDefinition,
    TThinkingConfig,
    TMessage,
    TDynamicMcpConfig
  >,
  overrides: LegacyReplOverrides<
    TMessage,
    TFileHistorySnapshot,
    TContentReplacement,
    TAgentColor,
    TRemoteSessionConfig,
    TDirectConnectConfig,
    TSSHSession
  > = {},
): LegacyLaunchContext<
  unknown,
  unknown,
  unknown,
  TCommand,
  TTool,
  TMcpClient,
  TAgentDefinition,
  TThinkingConfig,
  TMessage,
  TDynamicMcpConfig,
  TFileHistorySnapshot,
  TContentReplacement,
  TAgentColor,
  TRemoteSessionConfig,
  TDirectConnectConfig,
  TSSHSession
>['replProps'] {
  return {
    ...base,
    ...overrides,
  }
}

export function buildLegacyLaunchContext<
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
  TRemoteSessionConfig = unknown,
  TDirectConnectConfig = unknown,
  TSSHSession = unknown,
>(input: {
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
  replOverrides?: LegacyReplOverrides<
    TMessage,
    TFileHistorySnapshot,
    TContentReplacement,
    TAgentColor,
    TRemoteSessionConfig,
    TDirectConnectConfig,
    TSSHSession
  >
}): LegacyLaunchContext<
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
  TAgentColor,
  TRemoteSessionConfig,
  TDirectConnectConfig,
  TSSHSession
> {
  return {
    appProps: buildLegacyAppShellProps({
      getFpsMetrics: input.getFpsMetrics,
      stats: input.stats,
      initialState: input.initialState,
    }),
    replProps: buildLegacyReplProps(input.replBase, input.replOverrides),
  }
}
