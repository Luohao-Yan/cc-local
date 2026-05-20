import type { ComponentType } from 'react'

export type WizardStepComponent = ComponentType<Record<string, unknown>>

export interface WizardContextValue<T = Record<string, unknown>> {
  currentStepIndex: number
  totalSteps: number
  wizardData: T
  setWizardData: (data: T) => void
  updateWizardData: (updater: Partial<T> | ((prev: T) => Partial<T>)) => void
  goNext: () => void
  goBack: () => void
  goToStep: (index: number) => void
  cancel: () => void
  title?: string
  showStepCounter?: boolean
}

export interface WizardProviderProps<T = Record<string, unknown>> {
  steps: WizardStepComponent[]
  initialData?: T
  onComplete: (data: T) => void
  onCancel?: () => void
  children?: React.ReactNode
  title?: string
  showStepCounter?: boolean
}
