/**
 * Anthropic OAuth Provider
 */

import { OAuthClient } from '../OAuthClient'
import { SecureStorage } from '../SecureStorage'

const ANTHROPIC_OAUTH_CONFIG = {
  clientId: '9d1c250a-e0b9-4f26-8c72-e03f1f1f2187',
  authorizationEndpoint: 'https://claude.ai/oauth/authorize',
  tokenEndpoint: 'https://claude.ai/oauth/token',
  scope: ['openid', 'profile', 'email', 'offline_access'],
  usePKCE: true,
}

export class AnthropicAuth extends OAuthClient {
  constructor(storage: SecureStorage) {
    super('claudeai', ANTHROPIC_OAUTH_CONFIG, storage)
  }
}
