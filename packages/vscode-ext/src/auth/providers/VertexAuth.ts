/**
 * Google Vertex AI Authentication Provider
 */

import * as vscode from 'vscode'
import { ApiKeyAuth } from '../ApiKeyAuth'
import { SecureStorage } from '../SecureStorage'

export interface VertexConfig {
  projectId: string
  region?: string
  credentialsPath?: string
}

export class VertexAuth extends ApiKeyAuth {
  private config: VertexConfig | null = null

  constructor(storage: SecureStorage) {
    super('vertex', {
      provider: 'vertex',
      envVarName: 'GOOGLE_APPLICATION_CREDENTIALS',
    }, storage)
  }

  /**
   * Configure Vertex AI credentials
   */
  async configure(): Promise<boolean> {
    // Check if GCP credentials are already configured
    const hasEnvCredentials = this.checkEnvironmentCredentials()

    if (hasEnvCredentials) {
      vscode.window.showInformationMessage(
        'GCP credentials found in environment variables'
      )
      return true
    }

    // Show configuration options
    const options = [
      { label: '$(file) Service Account Key File', action: 'keyfile' },
      { label: '$(key) Enter API Key', action: 'apikey' },
      { label: '$(cloud) Use Default Credentials', action: 'default' },
    ]

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select GCP credential method',
    })

    if (!selected) return false

    switch (selected.action) {
      case 'keyfile':
        return await this.configureKeyFile()
      case 'apikey':
        return await this.configureApiKey()
      case 'default':
        return await this.configureDefault()
    }

    return false
  }

  /**
   * Configure with service account key file
   */
  private async configureKeyFile(): Promise<boolean> {
    const projectId = await vscode.window.showInputBox({
      prompt: 'GCP Project ID',
      placeHolder: 'my-project-id',
    })

    if (!projectId) return false

    const keyFileUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { 'JSON Files': ['json'] },
      title: 'Select Service Account Key File',
    })

    if (!keyFileUri || keyFileUri.length === 0) return false

    this.config = {
      projectId,
      credentialsPath: keyFileUri[0].fsPath,
    }

    // Store configuration
    await this.storeApiKey(JSON.stringify(this.config))

    return true
  }

  /**
   * Configure with API key
   */
  private async configureApiKey(): Promise<boolean> {
    const projectId = await vscode.window.showInputBox({
      prompt: 'GCP Project ID',
      placeHolder: 'my-project-id',
    })

    if (!projectId) return false

    const apiKey = await vscode.window.showInputBox({
      prompt: 'GCP API Key',
      password: true,
    })

    if (!apiKey) return false

    this.config = {
      projectId,
    }

    await this.storeApiKey(apiKey)
    await this.storeProjectId(projectId)

    return true
  }

  /**
   * Configure with default credentials
   */
  private async configureDefault(): Promise<boolean> {
    const projectId = await vscode.window.showInputBox({
      prompt: 'GCP Project ID',
      placeHolder: 'my-project-id',
    })

    if (!projectId) return false

    this.config = {
      projectId,
    }

    await this.storeProjectId(projectId)

    return true
  }

  /**
   * Check if environment has GCP credentials
   */
  private checkEnvironmentCredentials(): boolean {
    return !!(
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GCP_PROJECT_ID ||
      process.env.ANTHROPIC_VERTEX_PROJECT_ID
    )
  }

  /**
   * Store project ID
   */
  private async storeProjectId(projectId: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('cclocal')
    await config.update('vertexProjectId', projectId, vscode.ConfigurationTarget.Global)
  }

  /**
   * Get Vertex configuration
   */
  getConfig(): VertexConfig | null {
    return this.config
  }

  /**
   * Get project ID
   */
  getProjectId(): string {
    return this.config?.projectId ||
      process.env.ANTHROPIC_VERTEX_PROJECT_ID ||
      process.env.GCP_PROJECT_ID ||
      ''
  }

  /**
   * Get region
   */
  getRegion(): string {
    return this.config?.region ||
      process.env.ANTHROPIC_VERTEX_REGION ||
      process.env.VERTEX_REGION ||
      'us-central1'
  }
}
