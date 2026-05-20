/**
 * Session Transcript Mirror — writes NDJSON transcript segments
 * alongside session files for real-time subprocess→parent synchronization.
 *
 * When a sub-agent (forked agent) runs, it writes its conversation
 * to a shared transcript file that the parent session can monitor
 * for progress. This is gated by the KAIROS feature flag in the
 * official client; in cc-local we make it always available.
 */

import { appendFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import type { Message } from '../../types/message.js'

/**
 * Append a batch of messages to the session transcript file.
 * Each message is written as a single NDJSON line.
 *
 * The transcript file lives at:
 *   ~/.claude/projects/<sanitized-cwd>/<session-id>.transcript.ndjson
 *
 * This is a fire-and-forget operation — failures are logged
 * but don't interrupt the query loop.
 */
export function writeSessionTranscriptSegment(messages: Message[]): void {
  if (messages.length === 0) return

  // Determine transcript path from the session storage conventions.
  // We derive it from CLAUDE_SESSION_ID or fall back to a default.
  const sessionId = process.env.CLAUDE_SESSION_ID
  if (!sessionId) return

  const cwd = process.cwd()
  // Sanitize cwd for use as a directory name (matches official convention)
  const sanitizedCwd = cwd
    .replace(/[/\\]/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '_')

  const transcriptPath = `${process.env.HOME || process.env.USERPROFILE || '~'}/.claude/projects/${sanitizedCwd}/${sessionId}.transcript.ndjson`

  // Write asynchronously, don't block the query loop
  void (async () => {
    try {
      await mkdir(dirname(transcriptPath), { recursive: true })

      const lines = messages
        .map((msg) => {
          try {
            return JSON.stringify(msg)
          } catch {
            return null
          }
        })
        .filter((line): line is string => line !== null)
        .join('\n') + '\n'

      await appendFile(transcriptPath, lines, 'utf-8')
    } catch (error) {
      // Best-effort: don't disrupt the query loop
      if (process.env.DEBUG) {
        console.error(
          `[transcript] Failed to write segment: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  })()
}

/**
 * Flush the transcript on date change (midnight rollover).
 * This creates a new transcript file if the date has changed
 * since the last write, ensuring transcripts don't grow unbounded.
 */
export function flushOnDateChange(
  _messages: Message[],
  _currentDate: string,
): void {
  // In the official client, this checks if the date has rolled over
  // and creates a new file. For simplicity, we rely on append-only
  // writing. The cleanup.ts module handles rotating old transcript files.
}
