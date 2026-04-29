export interface AgentWizardData {
  agentType?: string
  systemPrompt?: string
  whenToUse?: string
  method?: 'generate' | 'manual'
  wasGenerated?: boolean
  generationPrompt?: string
  isGenerating?: boolean
  generatedAgent?: {
    identifier: string
    whenToUse: string
    systemPrompt: string
  }
  location?: string
  selectedTools?: string[]
  selectedModel?: string
  selectedColor?: string
  finalAgent?: {
    agentType: string
    whenToUse: string
    getSystemPrompt: () => string
    tools?: string[]
    model?: string
    color?: string
    source?: string
    memory?: string
  }
}
