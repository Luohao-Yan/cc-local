/**
 * AWS Bedrock Authentication Provider
 */

import * as vscode from 'vscode'
import { ApiKeyAuth } from '../ApiKeyAuth'
import { SecureStorage } from '../SecureStorage'

export interface BedrockConfig {
  region: string
  accessKeyId?: string
  secretAccessKey?: string
  sessionToken?: string
  profile?: string
}

export class BedrockAuth extends ApiKeyAuth {
  private config: BedrockConfig | null = null

  constructor(storage: SecureStorage) {
    super('bedrock', {
      provider: 'bedrock',
      envVarName: 'AWS_ACCESS_KEY_ID',
    }, storage)
  }

  /**
   * Configure Bedrock credentials
   */
  async configure(): Promise<boolean> {
    // Check if AWS credentials are already configured
    const hasEnvCredentials = this.checkEnvironmentCredentials()

    if (hasEnvCredentials) {
      vscode.window.showInformationMessage(
        'AWS credentials found in environment variables'
      )
      return true
    }

    // Show configuration options
    const options = [
      { label: '$(key) Enter AWS Access Keys', action: 'keys' },
      { label: '$(file) Use AWS Profile', action: 'profile' },
      { label: '$(cloud) Use IAM Role (EC2/Lambda)', action: 'role' },
    ]

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select AWS credential method',
    })

    if (!selected) return false

    switch (selected.action) {
      case 'keys':
        return await this.configureAccessKeys()
      case 'profile':
        return await this.configureProfile()
      case 'role':
        return true // IAM role is automatic
    }

    return false
  }

  /**
   * Configure with access keys
   */
  private async configureAccessKeys(): Promise<boolean> {
    const region = await vscode.window.showInputBox({
      prompt: 'AWS Region',
      placeHolder: 'us-east-1',
      value: 'us-east-1',
    })

    if (!region) return false

    const accessKeyId = await vscode.window.showInputBox({
      prompt: 'AWS Access Key ID',
      placeHolder: 'AKIA...',
    })

    if (!accessKeyId) return false

    const secretAccessKey = await vscode.window.showInputBox({
      prompt: 'AWS Secret Access Key',
      password: true,
    })

    if (!secretAccessKey) return false

    const sessionToken = await vscode.window.showInputBox({
      prompt: 'AWS Session Token (optional)',
      password: true,
    })

    this.config = {
      region,
      accessKeyId,
      secretAccessKey,
      sessionToken: sessionToken || undefined,
    }

    // Store credentials
    await this.storeApiKey(JSON.stringify(this.config))
    await this.storeRegion(region)

    return true
  }

  /**
   * Configure with AWS profile
   */
  private async configureProfile(): Promise<boolean> {
    const profile = await vscode.window.showInputBox({
      prompt: 'AWS Profile Name',
      placeHolder: 'default',
      value: 'default',
    })

    if (!profile) return false

    const region = await vscode.window.showInputBox({
      prompt: 'AWS Region',
      placeHolder: 'us-east-1',
      value: 'us-east-1',
    })

    if (!region) return false

    this.config = {
      region,
      profile,
    }

    await this.storeRegion(region)

    return true
  }

  /**
   * Check if environment has AWS credentials
   */
  private checkEnvironmentCredentials(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      process.env.AWS_PROFILE ||
      process.env.AWS_ROLE_ARN
    )
  }

  /**
   * Store region in VS Code configuration
   */
  private async storeRegion(region: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('cclocal')
    await config.update('bedrockRegion', region, vscode.ConfigurationTarget.Global)
  }

  /**
   * Get Bedrock configuration
   */
  getConfig(): BedrockConfig | null {
    return this.config
  }

  /**
   * Get region
   */
  getRegion(): string {
    return this.config?.region ||
      process.env.AWS_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      'us-east-1'
  }
}
