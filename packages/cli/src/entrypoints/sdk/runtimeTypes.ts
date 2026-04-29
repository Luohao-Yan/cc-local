export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

export type AnyZodRawShape = Record<string, unknown>
export type InferShape<T> = T

export interface Query {
  prompt: string
  [key: string]: unknown
}

export interface InternalQuery extends Query {
  [key: string]: unknown
}

export interface Options {
  [key: string]: unknown
}

export interface InternalOptions extends Options {
  [key: string]: unknown
}

export interface SDKSession {
  id: string
  [key: string]: unknown
}

export interface SDKSessionOptions {
  [key: string]: unknown
}

export interface SessionMessage {
  [key: string]: unknown
}

export interface ForkSessionOptions {
  [key: string]: unknown
}

export interface ForkSessionResult {
  [key: string]: unknown
}

export interface GetSessionInfoOptions {
  [key: string]: unknown
}

export interface GetSessionMessagesOptions {
  [key: string]: unknown
}

export interface ListSessionsOptions {
  [key: string]: unknown
}

export interface SessionMutationOptions {
  [key: string]: unknown
}

export interface McpSdkServerConfigWithInstance {
  [key: string]: unknown
}

export interface SdkMcpToolDefinition {
  [key: string]: unknown
}
