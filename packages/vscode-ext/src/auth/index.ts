/**
 * Authentication Module Exports
 */

export { SecureStorage } from './SecureStorage'
export type { SecureCredentials, SecureStorageOptions } from './SecureStorage'

export { OAuthClient } from './OAuthClient'
export type { OAuthConfig, OAuthTokens, OAuthState } from './OAuthClient'

export { ApiKeyAuth } from './ApiKeyAuth'
export type { ApiKeyConfig, ApiKeyValidationResult } from './ApiKeyAuth'

export { AuthManager } from './AuthManager'
export type { AuthMethod, AuthStatus, AuthState, AuthConfig } from './AuthManager'

export { AnthropicAuth } from './providers/AnthropicAuth'
export { BedrockAuth } from './providers/BedrockAuth'
export type { BedrockConfig } from './providers/BedrockAuth'
export { VertexAuth } from './providers/VertexAuth'
export type { VertexConfig } from './providers/VertexAuth'
export { CustomProviderAuth } from './providers/CustomProviderAuth'
export type { CustomProviderConfig, ModelsConfig } from './providers/CustomProviderAuth'

export { AuthStatusBarItem, AuthStatusBar } from './AuthStatusBar'
export { registerAuthCommands } from './AuthStatusBar'
