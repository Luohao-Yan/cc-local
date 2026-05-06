/**
 * React hook for i18n translations
 *
 * Usage:
 * ```tsx
 * import { useTranslation } from '../hooks/useTranslation.js'
 *
 * function MyComponent() {
 *   const { t } = useTranslation()
 *   return <Text>{t('welcome.title')}</Text>
 * }
 * ```
 */

import { useCallback } from 'react'
import { t as tFunction, getUILanguage, type UILanguage, type TranslationKey } from '../utils/i18n/index.js'

export interface UseTranslationResult {
  /** Translate a key to the current language */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  /** Current UI language */
  language: UILanguage
}

/**
 * Hook for accessing i18n translations
 *
 * Note: This hook does NOT subscribe to language changes.
 * For components that need to re-render on language change,
 * use the `language` return value to trigger re-renders.
 */
export function useTranslation(): UseTranslationResult {
  const language = getUILanguage()

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return tFunction(key, params)
    },
    [language]
  )

  return { t, language }
}

/**
 * Get translation function without React hook
 * Use this for non-component code
 */
export { t as tStatic, getUILanguage, setUILanguage, initI18n, type UILanguage, type TranslationKey } from '../utils/i18n/index.js'
