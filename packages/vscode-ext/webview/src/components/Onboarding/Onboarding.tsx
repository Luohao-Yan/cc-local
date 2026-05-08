/**
 * Onboarding — First-use questionnaire matching official extension.
 *
 * Shows a multi-step onboarding flow when the user first opens the sidebar.
 * Steps:
 *   1. Welcome
 *   2. Use case selection
 *   3. Coding experience
 *   4. Preference (concise vs detailed)
 *
 * Dismissal sends `dismiss_onboarding` to the extension which stores
 * the flag in globalState so it won't show again.
 */

import { useState, useCallback } from 'react'

interface OnboardingProps {
  onDismiss: () => void
}

type Step = 'welcome' | 'usecase' | 'experience' | 'preference'

const STEPS: Step[] = ['welcome', 'usecase', 'experience', 'preference']

const USE_CASES = [
  { id: 'coding', label: 'Writing & editing code', icon: '{ }' },
  { id: 'debugging', label: 'Debugging & fixing issues', icon: '!' },
  { id: 'exploring', label: 'Explaining & understanding code', icon: '?' },
  { id: 'planning', label: 'Planning & architecture', icon: '#' },
]

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
]

const PREFERENCES = [
  { id: 'concise', label: 'Concise', desc: 'Brief, to-the-point responses' },
  { id: 'detailed', label: 'Detailed', desc: 'Thorough explanations with context' },
]

export default function Onboarding({ onDismiss }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [useCase, setUseCase] = useState<string>('')
  const [experience, setExperience] = useState<string>('')
  const [preference, setPreference] = useState<string>('')

  const stepIndex = STEPS.indexOf(step)

  const postToExt = useCallback((type: string, data?: Record<string, unknown>) => {
    const vscodeApi = (window as any).__vscodeApi
    if (vscodeApi) {
      vscodeApi.postMessage({ type, ...data })
    }
  }, [])

  const handleFinish = useCallback(() => {
    postToExt('dismissOnboarding', {
      useCase,
      experience,
      preference,
    })
    onDismiss()
  }, [postToExt, useCase, experience, preference, onDismiss])

  const handleSkip = useCallback(() => {
    postToExt('dismissOnboarding', {})
    onDismiss()
  }, [postToExt, onDismiss])

  const goNext = () => {
    const next = STEPS[stepIndex + 1]
    if (next) setStep(next)
    else handleFinish()
  }

  return (
    <div className="onboarding">
      {/* Progress bar */}
      <div className="onboarding-progress">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`onboarding-progress-dot ${i <= stepIndex ? 'active' : ''}`}
          />
        ))}
      </div>

      {/* Step: Welcome */}
      {step === 'welcome' && (
        <div className="onboarding-step">
          <div className="onboarding-icon">CCLocal</div>
          <h2>Welcome to CCLocal</h2>
          <p>Your AI coding assistant that understands your codebase.</p>
          <p className="onboarding-hint">Let's set up your preferences — takes 30 seconds.</p>
          <button className="onboarding-btn primary" onClick={goNext}>
            Get Started
          </button>
          <button className="onboarding-btn link" onClick={handleSkip}>
            Skip setup
          </button>
        </div>
      )}

      {/* Step: Use Case */}
      {step === 'usecase' && (
        <div className="onboarding-step">
          <h2>What do you want to use CCLocal for?</h2>
          <p className="onboarding-hint">Select your primary use case</p>
          <div className="onboarding-options">
            {USE_CASES.map(uc => (
              <button
                key={uc.id}
                className={`onboarding-option ${useCase === uc.id ? 'selected' : ''}`}
                onClick={() => setUseCase(uc.id)}
              >
                <span className="onboarding-option-icon">{uc.icon}</span>
                <span className="onboarding-option-label">{uc.label}</span>
              </button>
            ))}
          </div>
          <div className="onboarding-actions">
            <button className="onboarding-btn link" onClick={() => setStep(STEPS[stepIndex - 1])}>
              Back
            </button>
            <button className="onboarding-btn primary" onClick={goNext} disabled={!useCase}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step: Experience */}
      {step === 'experience' && (
        <div className="onboarding-step">
          <h2>How experienced are you with coding?</h2>
          <p className="onboarding-hint">This helps tailor response detail</p>
          <div className="onboarding-options">
            {EXPERIENCE_LEVELS.map(exp => (
              <button
                key={exp.id}
                className={`onboarding-option ${experience === exp.id ? 'selected' : ''}`}
                onClick={() => setExperience(exp.id)}
              >
                <span className="onboarding-option-label">{exp.label}</span>
              </button>
            ))}
          </div>
          <div className="onboarding-actions">
            <button className="onboarding-btn link" onClick={() => setStep(STEPS[stepIndex - 1])}>
              Back
            </button>
            <button className="onboarding-btn primary" onClick={goNext} disabled={!experience}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step: Preference */}
      {step === 'preference' && (
        <div className="onboarding-step">
          <h2>Response style preference</h2>
          <p className="onboarding-hint">You can always change this later</p>
          <div className="onboarding-options">
            {PREFERENCES.map(pref => (
              <button
                key={pref.id}
                className={`onboarding-option ${preference === pref.id ? 'selected' : ''}`}
                onClick={() => setPreference(pref.id)}
              >
                <span className="onboarding-option-label">{pref.label}</span>
                <span className="onboarding-option-desc">{pref.desc}</span>
              </button>
            ))}
          </div>
          <div className="onboarding-actions">
            <button className="onboarding-btn link" onClick={() => setStep(STEPS[stepIndex - 1])}>
              Back
            </button>
            <button className="onboarding-btn primary" onClick={handleFinish} disabled={!preference}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
