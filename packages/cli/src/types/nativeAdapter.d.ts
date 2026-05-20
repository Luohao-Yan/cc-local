/**
 * Type declarations for the nativeAdapter module.
 * This is an internal Anthropic feature for native app integration that is disabled.
 */
export interface NativeAdapterConfig {
  endpoint?: string
  apiKey?: string
  model?: string
  [key: string]: unknown
}

export interface INativeAdapter {
  query(messages: unknown[], options?: Record<string, unknown>): Promise<unknown>
  queryStream(messages: unknown[], onEvent: (event: unknown) => void, options?: Record<string, unknown>): Promise<unknown>
  cancel(): void
}
