/**
 * Task Summary utilities for background sessions
 *
 * Provides task tracking and summary generation for bg sessions.
 */

export interface TaskSummary {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: number
  completedAt?: number
  result?: string
  error?: string
}

/**
 * Generate a summary of tasks completed in a session
 */
export function generateTaskSummary(_sessionId: string): TaskSummary | null {
  // TODO: Implement task summary generation
  return null
}

/**
 * Format task summary for display
 */
export function formatTaskSummary(summary: TaskSummary): string {
  const duration = summary.completedAt
    ? `${Math.round((summary.completedAt - summary.startedAt) / 1000)}s`
    : 'ongoing'

  return `[${summary.status}] ${summary.name} (${duration})`
}

/**
 * Get all task summaries for a session
 */
export function getSessionTaskSummaries(_sessionId: string): TaskSummary[] {
  // TODO: Implement session task tracking
  return []
}
