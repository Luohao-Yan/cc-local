/**
 * systemThemeWatcher.ts — OSC 11 background-color watcher for 'auto' theme.
 *
 * Polls the terminal background color via OSC 11 at startup and on an interval,
 * updating the cached system theme and calling the provided callback whenever
 * the resolved theme changes. This enables the 'auto' theme setting to track
 * terminal light/dark mode in real time.
 */

import { oscColor } from '../ink/terminal-querier.js'
import type { TerminalQuerier } from '../ink/terminal-querier.js'
import { setCachedSystemTheme, themeFromOscColor } from './systemTheme.js'
import type { SystemTheme } from './systemTheme.js'

/** Poll interval in milliseconds for checking terminal background color. */
const POLL_INTERVAL_MS = 2000

/**
 * Watch for live terminal theme changes via OSC 11 queries.
 *
 * Queries the terminal background color immediately on start, then every
 * POLL_INTERVAL_MS milliseconds. Calls `onTheme` whenever the detected
 * theme changes. Updates the module-level cache in systemTheme.ts so
 * non-React callers stay in sync.
 *
 * @param querier  Terminal querier for sending OSC 11 requests.
 * @param onTheme  Callback invoked when the detected theme changes.
 * @returns        A cleanup function that stops the watcher.
 */
export function watchSystemTheme(
  querier: TerminalQuerier,
  onTheme: (theme: SystemTheme) => void,
): () => void {
  let cancelled = false
  let lastTheme: SystemTheme | undefined

  /** Send one OSC 11 query and process the response. */
  async function poll(): Promise<void> {
    if (cancelled) return
    try {
      const [response] = await Promise.all([
        querier.send(oscColor(11)),
        querier.flush(),
      ])
      if (cancelled) return
      if (!response) return
      const theme = themeFromOscColor(response.data)
      if (!theme) return
      // Update module-level cache so resolveThemeSetting() stays in sync.
      setCachedSystemTheme(theme)
      if (theme !== lastTheme) {
        lastTheme = theme
        onTheme(theme)
      }
    } catch {
      // Ignore query errors (terminal may not support OSC 11).
    }
  }

  // Query immediately, then on interval.
  void poll()
  const timer = setInterval(() => { void poll() }, POLL_INTERVAL_MS)

  return () => {
    cancelled = true
    clearInterval(timer)
  }
}
