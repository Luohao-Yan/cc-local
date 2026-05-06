/**
 * i18n Core Module for cc-local
 *
 * Provides UI language translation support with auto-detection.
 * Supports: en (English), zh (Chinese)
 *
 * Translations are organized in modular files under locales/en/ and locales/zh/
 * Each module exports nested objects that are flattened into the final translations.
 */

import * as enModules from './locales/en/index.js'
import * as zhModules from './locales/zh/index.js'

export type UILanguage = 'en' | 'zh'
export type TranslationKey = string

/**
 * Flatten nested translation objects into dot-notation keys.
 * e.g., { modelAdd: { step1: "..." } } becomes { "modelAdd.step1": "..." }
 */
function flattenTranslations(modules: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}

  function flatten(obj: unknown, prefix: string): void {
    if (obj === null || obj === undefined) return

    if (typeof obj === 'string') {
      result[prefix] = obj
      return
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const newPrefix = prefix ? `${prefix}.${key}` : key
        flatten(value, newPrefix)
      }
    }
  }

  // Process each module - pass the module name as the initial prefix
  for (const [moduleName, moduleObj] of Object.entries(modules)) {
    // Skip any non-object exports
    if (typeof moduleObj !== 'object' || moduleObj === null) continue
    // Handle reserved words: export_ -> export
    const normalizedName = moduleName.endsWith('_') && moduleName !== '_'
      ? moduleName.slice(0, -1)
      : moduleName
    // Start flattening with the module name as prefix
    flatten(moduleObj, normalizedName)
  }

  return result
}

// Build translations from modular files
const translations: Record<UILanguage, Record<string, string>> = {
  en: flattenTranslations(enModules),
  zh: flattenTranslations(zhModules),
}

// ===== Current Language State =====

let currentLanguage: UILanguage = 'en' // Will be set by initI18n()

/**
 * Detect system language from environment.
 * Priority: CLAUDE_CODE_LANGUAGE > system locale > default (en)
 */
export function detectSystemLanguage(): UILanguage {
  // 1. Check environment variable
  const envLang = process.env.CLAUDE_CODE_LANGUAGE
  if (envLang === 'zh' || envLang?.startsWith('zh-')) return 'zh'
  if (envLang === 'en' || envLang?.startsWith('en-')) return 'en'

  // 2. Use Intl API to detect system locale
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    if (locale.startsWith('zh')) return 'zh'
  } catch {
    // Intl API may not be available in all environments
  }

  // 3. Default to English
  return 'en'
}

/**
 * Initialize i18n with a specific language.
 * Called during app startup with saved language preference.
 */
export function initI18n(lang: string | undefined): void {
  if (lang === 'en' || lang === 'zh') {
    currentLanguage = lang
  } else if (lang === 'auto' || !lang) {
    currentLanguage = detectSystemLanguage()
  } else {
    // Fallback for unknown values
    currentLanguage = 'en'
  }
}

/**
 * Set the UI language.
 */
export function setUILanguage(lang: UILanguage): void {
  currentLanguage = lang
}

/**
 * Get the current UI language.
 */
export function getUILanguage(): UILanguage {
  return currentLanguage
}

/**
 * Get all translations for a language.
 */
export function getTranslations(lang: UILanguage = currentLanguage): Record<string, string> {
  return translations[lang]
}

/**
 * Translate a key with optional parameters.
 *
 * @param key - Translation key (dot notation, e.g., "welcome.title")
 * @param params - Optional parameters for interpolation (e.g., { name: "John" })
 * @returns Translated string, or the key if not found
 *
 * @example
 * t('welcome.title') // "Welcome back!"
 * t('welcome.titleWithName', { name: 'John' }) // "Welcome back John!"
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const translationsForLang = translations[currentLanguage]

  // Get the translation
  let text = translationsForLang[key]

  // Fallback to English if key not found in current language
  if (text === undefined && currentLanguage !== 'en') {
    text = translations.en[key]
  }

  // Fallback to key itself if not found
  if (text === undefined) {
    return key
  }

  // Interpolate parameters
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
    }
  }

  return text
}

// Re-export types and utility functions for convenience
export { translations }
