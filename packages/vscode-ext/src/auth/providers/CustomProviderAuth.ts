/**
 * Custom Provider Authentication (Third-party API)
 * Supports OpenAI-compatible APIs via models.json or Web UI configuration
 */

import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ApiKeyAuth } from '../ApiKeyAuth'
import { SecureStorage } from '../SecureStorage'

export interface CustomProviderConfig {
  name: string
  baseUrl: string
  apiKey: string
  apiFormat?: 'anthropic' | 'openai'
  models?: Record<string, { name: string; alias?: string[] }>
}

export interface ModelsConfig {
  providers: Record<string, CustomProviderConfig>
  defaultModel?: string
  smallFastModel?: string
}

const MODELS_CONFIG_PATH = path.join(os.homedir(), '.claude', 'models.json')

export class CustomProviderAuth extends ApiKeyAuth {
  private modelsConfig: ModelsConfig | null = null

  constructor(storage: SecureStorage) {
    super('custom', {
      provider: 'custom',
    }, storage)
  }

  /**
   * Configure custom provider
   */
  async configure(): Promise<boolean> {
    // Try to load existing config
    await this.loadModelsConfig()

    // Show configuration options
    const options = [
      { label: '$(add) Add New Provider', action: 'new' },
      { label: '$(file) Edit models.json', action: 'edit' },
      { label: '$(list) View Existing Providers', action: 'list' },
    ]

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Custom Provider Configuration',
    })

    if (!selected) return false

    switch (selected.action) {
      case 'new':
        return await this.addNewProvider()
      case 'edit':
        return await this.editModelsJson()
      case 'list':
        return await this.listProviders()
    }

    return false
  }

  /**
   * Add new custom provider
   */
  private async addNewProvider(): Promise<boolean> {
    // Step 1: Provider Name
    const name = await vscode.window.showInputBox({
      prompt: 'Provider Name',
      placeHolder: 'e.g., OpenRouter, DeepSeek, Groq',
    })

    if (!name) return false

    // Step 2: Base URL
    const baseUrl = await vscode.window.showInputBox({
      prompt: 'API Base URL',
      placeHolder: 'https://api.example.com/v1',
    })

    if (!baseUrl) return false

    // Step 3: API Format
    const apiFormatOptions = [
      { label: 'Anthropic', value: 'anthropic' as const },
      { label: 'OpenAI', value: 'openai' as const },
    ]

    const apiFormatSelected = await vscode.window.showQuickPick(apiFormatOptions, {
      placeHolder: 'Select API Format',
    })

    if (!apiFormatSelected) return false

    const apiFormat = apiFormatSelected.value

    // Step 4: API Key
    const apiKey = await vscode.window.showInputBox({
      prompt: 'API Key',
      password: true,
    })

    if (!apiKey) return false

    // Step 5: Model Name (optional)
    const modelName = await vscode.window.showInputBox({
      prompt: 'Default Model Name (optional)',
      placeHolder: 'e.g., gpt-4, claude-3-opus',
    })

    // Step 6: Validate configuration
    const isValid = await this.validateProvider({
      name,
      baseUrl,
      apiKey,
      apiFormat,
    })

    if (!isValid) {
      const continueAnyway = await vscode.window.showWarningMessage(
        'Could not validate the API configuration. Save anyway?',
        'Yes',
        'No'
      )
      if (continueAnyway !== 'Yes') return false
    }

    // Step 7: Save configuration
    await this.saveProviderConfig({
      name,
      baseUrl,
      apiKey,
      apiFormat,
      models: modelName ? { [modelName]: { name: modelName } } : undefined,
    })

    vscode.window.showInformationMessage(`Provider "${name}" configured successfully!`)

    return true
  }

  /**
   * Validate provider configuration
   */
  private async validateProvider(config: CustomProviderConfig): Promise<boolean> {
    try {
      // Try to make a test request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (config.apiFormat === 'openai') {
        headers['Authorization'] = `Bearer ${config.apiKey}`
      } else {
        headers['x-api-key'] = config.apiKey
      }

      // Try models endpoint first
      const modelsUrl = config.baseUrl.endsWith('/')
        ? `${config.baseUrl}models`
        : `${config.baseUrl}/models`

      const response = await fetch(modelsUrl, { headers })

      if (response.ok) {
        return true
      }

      // Some APIs don't have /models endpoint, try a simple chat completion
      if (response.status === 404) {
        // Could still be valid, just no models endpoint
        return true
      }

      return response.status < 500
    } catch {
      return false
    }
  }

  /**
   * Save provider configuration to models.json
   */
  private async saveProviderConfig(config: CustomProviderConfig): Promise<void> {
    if (!this.modelsConfig) {
      this.modelsConfig = { providers: {} }
    }

    // Generate provider key (lowercase, no spaces)
    const providerKey = config.name.toLowerCase().replace(/\s+/g, '-')

    // Store API key in secure storage with env reference
    await this.storeApiKey(config.apiKey)

    // Create provider entry with env reference
    this.modelsConfig.providers[providerKey] = {
      name: config.name,
      baseUrl: config.baseUrl,
      apiKey: `{env:CCLOCAL_${providerKey.toUpperCase()}_API_KEY}`,
      apiFormat: config.apiFormat,
      models: config.models,
    }

    // Save to file
    await this.saveModelsConfig()

    // Also set environment variable for current session
    process.env[`CCLOCAL_${providerKey.toUpperCase()}_API_KEY`] = config.apiKey
  }

  /**
   * Edit models.json file
   */
  private async editModelsJson(): Promise<boolean> {
    // Ensure file exists
    if (!fs.existsSync(MODELS_CONFIG_PATH)) {
      await this.createDefaultModelsConfig()
    }

    // Open file in VS Code
    const document = await vscode.workspace.openTextDocument(MODELS_CONFIG_PATH)
    await vscode.window.showTextDocument(document)

    return true
  }

  /**
   * List existing providers
   */
  private async listProviders(): Promise<boolean> {
    await this.loadModelsConfig()

    if (!this.modelsConfig || Object.keys(this.modelsConfig.providers).length === 0) {
      vscode.window.showInformationMessage('No custom providers configured yet.')
      return false
    }

    const items = Object.entries(this.modelsConfig.providers).map(([key, config]) => ({
      label: config.name,
      description: config.baseUrl,
      detail: `API Format: ${config.apiFormat || 'openai'}`,
      key,
    }))

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Configured Providers',
    })

    if (!selected) return false

    // Show options for selected provider
    const actions = [
      { label: '$(pencil) Edit', action: 'edit' },
      { label: '$(trash) Delete', action: 'delete' },
      { label: '$(check) Test', action: 'test' },
    ]

    const actionSelected = await vscode.window.showQuickPick(actions, {
      placeHolder: `Actions for ${selected.label}`,
    })

    if (!actionSelected) return false

    switch (actionSelected.action) {
      case 'edit':
        return await this.editProvider(selected.key)
      case 'delete':
        return await this.deleteProvider(selected.key)
      case 'test':
        return await this.testProvider(selected.key)
    }

    return false
  }

  /**
   * Edit a provider
   */
  private async editProvider(key: string): Promise<boolean> {
    await this.editModelsJson()
    return true
  }

  /**
   * Delete a provider
   */
  private async deleteProvider(key: string): Promise<boolean> {
    const confirm = await vscode.window.showWarningMessage(
      `Delete provider "${key}"?`,
      'Yes',
      'No'
    )

    if (confirm !== 'Yes') return false

    if (this.modelsConfig) {
      delete this.modelsConfig.providers[key]
      await this.saveModelsConfig()
    }

    return true
  }

  /**
   * Test a provider
   */
  private async testProvider(key: string): Promise<boolean> {
    if (!this.modelsConfig) return false

    const config = this.modelsConfig.providers[key]
    if (!config) return false

    const isValid = await this.validateProvider(config)

    if (isValid) {
      vscode.window.showInformationMessage(`Provider "${config.name}" is working!`)
    } else {
      vscode.window.showErrorMessage(`Provider "${config.name}" test failed.`)
    }

    return isValid
  }

  /**
   * Load models.json configuration
   */
  private async loadModelsConfig(): Promise<void> {
    try {
      if (fs.existsSync(MODELS_CONFIG_PATH)) {
        const content = await fs.promises.readFile(MODELS_CONFIG_PATH, 'utf8')
        this.modelsConfig = JSON.parse(content) as ModelsConfig
      } else {
        this.modelsConfig = { providers: {} }
      }
    } catch (error) {
      console.error('Failed to load models.json:', error)
      this.modelsConfig = { providers: {} }
    }
  }

  /**
   * Save models.json configuration
   */
  private async saveModelsConfig(): Promise<void> {
    const dir = path.dirname(MODELS_CONFIG_PATH)
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(
      MODELS_CONFIG_PATH,
      JSON.stringify(this.modelsConfig, null, 2),
      'utf8'
    )
  }

  /**
   * Create default models.json
   */
  private async createDefaultModelsConfig(): Promise<void> {
    const defaultConfig: ModelsConfig = {
      providers: {},
      defaultModel: undefined,
      smallFastModel: undefined,
    }

    await fs.promises.mkdir(path.dirname(MODELS_CONFIG_PATH), { recursive: true })
    await fs.promises.writeFile(
      MODELS_CONFIG_PATH,
      JSON.stringify(defaultConfig, null, 2),
      'utf8'
    )

    this.modelsConfig = defaultConfig
  }

  /**
   * Get all configured providers
   */
  async getConfiguredProviders(): Promise<Record<string, CustomProviderConfig>> {
    await this.loadModelsConfig()
    return this.modelsConfig?.providers || {}
  }

  /**
   * Get models.json path
   */
  static getModelsConfigPath(): string {
    return MODELS_CONFIG_PATH
  }
}
