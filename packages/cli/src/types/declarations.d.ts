/**
 * Missing module declarations for third-party and internal packages
 * that lack TypeScript type definitions.
 */

declare module 'react-reconciler/constants.js' {
  export const NoEventPriority: 0
  export const DiscreteEventPriority: number
  export const ContinuousEventPriority: number
  export const DefaultEventPriority: number
  export const IdleEventPriority: number
}

// Internal Anthropic packages (shimmed at runtime)
declare module '@ant/computer-use-mcp' {
  export class ComputerExecutor {}
  export interface DisplayGeometry {}
  export interface FrontmostApp {}
  export interface InstalledApp {}
  export interface RunningApp {}
  export interface ResolvePrepareCaptureResult {}
  export interface ScreenshotResult {}
  export interface ScreenshotDims {}
  export interface CuPermissionRequest {}
  export interface CuPermissionResponse {}
  export interface CuCallToolResult {}
  export interface ComputerUseSessionContext {}
  export interface ComputerUseHostAdapter {}
  export interface CoordinateMode {}
  export interface CuSubGates {}
  export interface Logger {}
  export const API_RESIZE_PARAMS: Record<string, unknown>
  export const DEFAULT_GRANT_FLAGS: Record<string, unknown>
  export const targetImageSize: (w: number, h: number, params: Record<string, unknown>) => [number, number]
  export function createComputerUseMcpServer(...args: unknown[]): unknown
  export function buildComputerUseTools(...args: unknown[]): unknown[]
  export function bindSessionContext(...args: unknown[]): void
}

declare module '@ant/computer-use-mcp/types' {
  export interface CoordinateMode {}
  export interface CuSubGates {}
  export interface ComputerUseHostAdapter {}
  export interface Logger {}
  export interface ComputerUseConfig {
    displayWidth?: number
    displayHeight?: number
    displayNumber?: number
  }
}

declare module '@ant/computer-use-mcp/sentinelApps' {
  export const sentinelApps: string[]
}

declare module '@ant/claude-for-chrome-mcp' {
  export const BROWSER_TOOLS: string[]
  export interface ClaudeForChromeContext {
    [key: string]: unknown
  }
  export function createClaudeForChromeMcpServer(config: Record<string, unknown>): unknown
  const value: Record<string, unknown>
  export default value
}

declare module '@ant/computer-use-swift' {
  const value: Record<string, unknown>
  export default value
}

declare module '@ant/computer-use-input' {
  const value: Record<string, unknown>
  export default value
}

declare module '@anthropic-ai/mcpb' {
  export interface McpbManifest {
    [key: string]: unknown
  }
  export interface McpbUserConfigurationOption {
    name: string
    title?: string
    description?: string
    type: 'string' | 'boolean' | 'number'
    required?: boolean
    default?: unknown
    sensitive?: boolean
    min?: number
  }
  export function createMcpBridge(...args: unknown[]): unknown
  export function startServer(...args: unknown[]): unknown
  export function getMcpConfigForManifest(...args: unknown[]): unknown
  export const McpbManifestSchema: { parse(input: unknown): McpbManifest }
}

declare module '@anthropic-ai/claude-agent-sdk' {
  export class AgentSDK {
    constructor(config: Record<string, unknown>)
    run(options: Record<string, unknown>): Promise<unknown>
  }
}

declare module '@anthropic-ai/sandbox-runtime' {
  export interface FsReadRestrictionConfig {
    allowRead?: string[]
    denyRead?: string[]
    denyOnly?: string[]
    allowWithinDeny?: string[]
  }

  export interface FsWriteRestrictionConfig {
    allowWrite?: string[]
    denyWrite?: string[]
    allowOnly?: string[]
    denyWithinAllow?: string[]
  }

  export interface NetworkHostPattern {
    host: string
    port?: number
  }

  export interface NetworkRestrictionConfig {
    allowDomains?: string[]
    denyDomains?: string[]
    allowManagedDomainsOnly?: boolean
    allowUnixSockets?: string[]
    allowAllUnixSockets?: boolean
    allowLocalBinding?: boolean
    httpProxyPort?: number
    socksProxyPort?: number
    allowedHosts?: NetworkHostPattern[]
    deniedHosts?: NetworkHostPattern[]
  }

  export interface IgnoreViolationsConfig {
    filesystem?: string[]
    network?: string[]
  }

  export interface SandboxRuntimeConfig {
    enabled?: boolean
    filesystem?: {
      allowRead?: string[]
      allowWrite?: string[]
      allowExec?: string[]
      denyRead?: string[]
      denyWrite?: string[]
      allowManagedReadPathsOnly?: boolean
    }
    network?: NetworkRestrictionConfig
    ignoreViolations?: IgnoreViolationsConfig
    ripgrep?: {
      command?: string
      args?: string[]
      argv0?: string
    }
    autoAllowBashIfSandboxed?: boolean
    allowUnsandboxedCommands?: boolean
    failIfUnavailable?: boolean
    enableWeakerNestedSandbox?: boolean
    enableWeakerNetworkIsolation?: boolean
    excludedCommands?: string[]
    bwrapPath?: string
    socatPath?: string
  }

  export interface SandboxViolationEvent {
    type: string
    category: 'filesystem' | 'network'
    path?: string
    host?: string
    [key: string]: unknown
  }

  export interface SandboxDependencyCheck {
    errors: string[]
    warnings: string[]
  }

  export type SandboxAskCallback = (
    hostPattern: NetworkHostPattern,
  ) => Promise<boolean>

  export class SandboxViolationStore {
    subscribe(listener: (violations: SandboxViolationEvent[]) => void): () => void
    getTotalCount(): number
  }

  export const SandboxRuntimeConfigSchema: {
    parse(config: unknown): SandboxRuntimeConfig
    safeParse(config: unknown): { success: boolean; data?: SandboxRuntimeConfig }
  }

  export class SandboxManager {
    static checkDependencies(opts?: { command?: string; args?: string[]; bwrapPath?: string; socatPath?: string }): SandboxDependencyCheck
    static isSupportedPlatform(): boolean
    static wrapWithSandbox(
      command: string,
      binShell?: string,
      customConfig?: Partial<SandboxRuntimeConfig>,
      abortSignal?: AbortSignal,
    ): Promise<string>
    static initialize(
      runtimeConfig: SandboxRuntimeConfig,
      callback?: SandboxAskCallback,
    ): Promise<void>
    static updateConfig(runtimeConfig: SandboxRuntimeConfig): void
    static reset(): Promise<void>
    static getFsReadConfig(): FsReadRestrictionConfig | undefined
    static getFsWriteConfig(): FsWriteRestrictionConfig | undefined
    static getNetworkRestrictionConfig(): NetworkRestrictionConfig | undefined
    static getIgnoreViolations(): IgnoreViolationsConfig | undefined
    static getAllowUnixSockets(): string[] | undefined
    static getAllowLocalBinding(): boolean | undefined
    static getEnableWeakerNestedSandbox(): boolean | undefined
    static getProxyPort(): number | undefined
    static getSocksProxyPort(): number | undefined
    static getLinuxHttpSocketPath(): string | undefined
    static getLinuxSocksSocketPath(): string | undefined
    static waitForNetworkInitialization(): Promise<boolean>
    static getSandboxViolationStore(): SandboxViolationStore
    static annotateStderrWithSandboxFailures(command: string, stderr: string): string
    static cleanupAfterCommand(): void
  }

  export function createSandbox(config: Record<string, unknown>): unknown
}

declare module '@anthropic-ai/vertex-sdk' {
  export class VertexClient {
    constructor(config: Record<string, unknown>)
  }
}

declare module '@anthropic-ai/foundry-sdk' {
  export class FoundryClient {
    constructor(config: Record<string, unknown>)
  }
}

// Native NAPI modules (shimmed at runtime)
declare module 'image-processor-napi' {
  export function processImage(buffer: Buffer, options?: Record<string, unknown>): Promise<Buffer>
  export function resizeImage(buffer: Buffer, width: number, height: number): Promise<Buffer>
}

declare module 'audio-capture-napi' {
  export function startCapture(callback: (data: Buffer) => void): void
  export function stopCapture(): void
  export function isNativeAudioAvailable(): boolean
}

declare module 'highlight.js' {
  export function getLanguage(name: string): { name: string; aliases: string[] } | undefined
  export function highlight(code: string, options: { language: string }): { value: string }
  export function registerLanguage(name: string, language: unknown): void
  export function listLanguages(): string[]
}

declare module 'url-handler-napi' {
  export function registerHandler(url: string): Promise<void>
  export function unregisterHandler(url: string): Promise<void>
}

// Removed/disabled internal modules (dead-code-eliminated)
// These are now declared via .d.ts files colocated with the
// importing source files so relative paths resolve correctly.

// Markdown file imports (bundled as raw strings)
declare module '*.md' {
  const content: string
  export default content
}

// Public npm packages without @types
declare module 'shell-quote' {
  export type ParseEntry = string | { [key: string]: string }
  export type ControlOperator = string
  export function parse(command: string): ParseEntry[]
  export function quote(args: string[]): string
}

declare module 'diff' {
  export type StructuredPatchHunk = import('diff').Hunk
}

declare module 'picomatch' {
  function picomatch(glob: string, options?: Record<string, unknown>): (input: string) => boolean
  export default picomatch
}

declare module 'bidi-js' {
  const bidiFactory: () => {
    getReorderSegments(text: string, direction?: string): unknown[]
  }
  export default bidiFactory
}

declare module 'asciichart' {
  export function plot(series: number[] | number[][], options?: Record<string, unknown>): string
}

declare module 'cacache' {
  export function get(cachePath: string, key: string): Promise<{ data: Buffer; integrity: string; metadata?: unknown }>
  export function put(cachePath: string, key: string, data: Buffer | string, options?: Record<string, unknown>): Promise<string>
  export function rm(cachePath: string, key: string): Promise<boolean>
  export function rmEntry(cachePath: string, key: string): Promise<boolean>
  export function ls(cachePath: string): AsyncIterable<[string, unknown]>
  export function verify(cachePath: string): Promise<{ runTime: number; entries: number; size: number }>
  export function clear(cachePath: string): Promise<void>
}

declare module 'vscode-languageserver-types' {
  export interface Position {
    line: number
    character: number
  }
  export interface Range {
    start: Position
    end: Position
  }
  export interface Location {
    uri: string
    range: Range
  }
  export interface LocationLink {
    originSelectionRange?: Range
    targetUri: string
    targetRange: Range
    targetSelectionRange?: Range
  }
  export interface Diagnostic {
    range: Range
    message: string
    severity?: number
    source?: string
  }
  export interface DocumentSymbol {
    name: string
    detail?: string
    kind: SymbolKind
    range: Range
    selectionRange: Range
    children?: DocumentSymbol[]
  }
  export interface SymbolInformation {
    name: string
    kind: SymbolKind
    location: Location
    containerName?: string
  }
  export enum SymbolKind {
    File = 0, Module = 1, Namespace = 2, Package = 3, Class = 4,
    Method = 5, Property = 6, Field = 7, Constructor = 8, Enum = 9,
    Interface = 10, Function = 11, Variable = 12, Constant = 13,
    String = 14, Number = 15, Boolean = 16, Array = 17, Object = 18,
    Key = 19, Null = 20, EnumMember = 21, Struct = 22, Event = 23,
    Operator = 24, TypeParameter = 25
  }
  export type MarkedString = string | { language: string; value: string }
  export interface MarkupContent {
    kind: 'plaintext' | 'markdown'
    value: string
  }
  export interface Hover {
    contents: MarkedString | MarkupContent | (MarkedString | MarkupContent)[]
    range?: Range
  }
  export interface CallHierarchyItem {
    name: string
    kind: SymbolKind
    uri: string
    range: Range
    selectionRange: Range
  }
  export interface CallHierarchyIncomingCall {
    from: CallHierarchyItem
    fromRanges: Range[]
  }
  export interface CallHierarchyOutgoingCall {
    to: CallHierarchyItem
    fromRanges: Range[]
  }
}

/**
 * Extended SDKControlPermissionRequest with additional properties
 * used by remote sessions that are not in the generated type.
 */
declare module '../entrypoints/sdk/controlTypes.js' {
  interface SDKControlPermissionRequestExtra {
    tool_name: string
    description?: string
    permission_suggestions?: PermissionUpdate[]
    blocked_path?: string
    input: Record<string, unknown>
    tool_use_id: string
  }
}

// Internal-only command modules (no type declarations)
declare module '../commands/autofix-pr/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/backfill-sessions/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/good-claude/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/issue/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/ctx_viz/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/break-cache/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/onboarding/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/share/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/teleport/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/bughunter/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/workflows/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/peers/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/fork/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/mock-limits/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/summary/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/reset-limits/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/ant-trace/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/perf-issue/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/env/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/oauth-refresh/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
declare module '../commands/debug-tool-call/index.js' {
  const value: import('../types/command.js').Command
  export default value
}
