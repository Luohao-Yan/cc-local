import { createContext, useCallback, useContext, useMemo } from 'react'
import { isProgressReportingAvailable, type Progress } from './terminal.js'
import { BEL } from './termio/ansi.js'
import { ITERM2, OSC, osc, PROGRESS, wrapForMultiplexer } from './termio/osc.js'

type WriteRaw = (data: string) => void

// Use globalThis to ensure the same context instance is used across all module instantiations
const GLOBAL_KEY = Symbol.for('cclocal.TerminalWriteContext')

function getOrCreateTerminalWriteContext(): React.Context<WriteRaw | null> {
  // @ts-expect-error: globalThis access
  if (!globalThis[GLOBAL_KEY]) {
    // @ts-expect-error: globalThis access
    globalThis[GLOBAL_KEY] = createContext<WriteRaw | null>(null)
  }
  // @ts-expect-error: globalThis access
  return globalThis[GLOBAL_KEY]
}

export const TerminalWriteContext = getOrCreateTerminalWriteContext()

// Debug: unique ID to track context instance
export const TERMINAL_WRITE_CONTEXT_ID = Symbol.for('TerminalWriteContext')

// @ts-expect-error: debug attachment
TerminalWriteContext._debugId = TERMINAL_WRITE_CONTEXT_ID

export const TerminalWriteProvider = TerminalWriteContext.Provider

export type TerminalNotification = {
  notifyITerm2: (opts: { message: string; title?: string }) => void
  notifyKitty: (opts: { message: string; title: string; id: number }) => void
  notifyGhostty: (opts: { message: string; title: string }) => void
  notifyBell: () => void
  /**
   * Report progress to the terminal via OSC 9;4 sequences.
   * Supported terminals: ConEmu, Ghostty 1.2.0+, iTerm2 3.6.6+
   * Pass state=null to clear progress.
   */
  progress: (state: Progress['state'] | null, percentage?: number) => void
}

export function useTerminalNotification(): TerminalNotification {
  const writeRaw = useContext(TerminalWriteContext)
  if (!writeRaw) {
    throw new Error(
      'useTerminalNotification must be used within TerminalWriteProvider',
    )
  }

  const write = writeRaw as WriteRaw

  const notifyITerm2 = useCallback(
    ({ message, title }: { message: string; title?: string }) => {
      const displayString = title ? `${title}:\n${message}` : message
      write(wrapForMultiplexer(osc(OSC.ITERM2, `\n\n${displayString}`)))
    },
    [writeRaw],
  )

  const notifyKitty = useCallback(
    ({
      message,
      title,
      id,
    }: {
      message: string
      title: string
      id: number
    }) => {
      write(wrapForMultiplexer(osc(OSC.KITTY, `i=${id}:d=0:p=title`, title)))
      write(wrapForMultiplexer(osc(OSC.KITTY, `i=${id}:p=body`, message)))
      write(wrapForMultiplexer(osc(OSC.KITTY, `i=${id}:d=1:a=focus`, '')))
    },
    [writeRaw],
  )

  const notifyGhostty = useCallback(
    ({ message, title }: { message: string; title: string }) => {
      write(wrapForMultiplexer(osc(OSC.GHOSTTY, 'notify', title, message)))
    },
    [writeRaw],
  )

  const notifyBell = useCallback(() => {
    // Raw BEL — inside tmux this triggers tmux's bell-action (window flag).
    // Wrapping would make it opaque DCS payload and lose that fallback.
    write(BEL)
  }, [writeRaw])

  const progress = useCallback(
    (state: Progress['state'] | null, percentage?: number) => {
      if (!isProgressReportingAvailable()) {
        return
      }
      if (!state) {
        write(
          wrapForMultiplexer(
            osc(OSC.ITERM2, ITERM2.PROGRESS, PROGRESS.CLEAR, ''),
          ),
        )
        return
      }
      const pct = Math.max(0, Math.min(100, Math.round(percentage ?? 0)))
      switch (state) {
        case 'completed':
          write(
            wrapForMultiplexer(
              osc(OSC.ITERM2, ITERM2.PROGRESS, PROGRESS.CLEAR, ''),
            ),
          )
          break
        case 'error':
          write(
            wrapForMultiplexer(
              osc(OSC.ITERM2, ITERM2.PROGRESS, PROGRESS.ERROR, pct),
            ),
          )
          break
        case 'indeterminate':
          write(
            wrapForMultiplexer(
              osc(OSC.ITERM2, ITERM2.PROGRESS, PROGRESS.INDETERMINATE, ''),
            ),
          )
          break
        case 'running':
          write(
            wrapForMultiplexer(
              osc(OSC.ITERM2, ITERM2.PROGRESS, PROGRESS.SET, pct),
            ),
          )
          break
        case null:
          // Handled by the if guard above
          break
      }
    },
    [writeRaw],
  )

  return useMemo(
    () => ({ notifyITerm2, notifyKitty, notifyGhostty, notifyBell, progress }),
    [notifyITerm2, notifyKitty, notifyGhostty, notifyBell, progress],
  )
}
