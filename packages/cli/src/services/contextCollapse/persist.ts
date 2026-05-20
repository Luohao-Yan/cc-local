/**
 * Persist/restore for context-collapse state.
 *
 * On resume, the transcript's contextCollapseCommits and contextCollapseSnapshot
 * entries are replayed into the live CollapseStore so that projectView()
 * can reconstruct the projected message list.
 */

import type {
  ContextCollapseCommitEntry,
  ContextCollapseSnapshotEntry,
} from '../../types/logs.js'
import { restoreFromCommitted, restoreFromSnapshot } from './index.js'
import { logForDebugging } from '../../utils/debug.js'

/**
 * Restore context-collapse commit log + snapshot after resume.
 */
export function restoreFromEntries(
  entries: ContextCollapseCommitEntry[],
  snapshot: ContextCollapseSnapshotEntry | undefined,
): void {
  if (entries.length > 0) {
    restoreFromCommitted(entries)
  }

  if (snapshot) {
    restoreFromSnapshot(snapshot)
  }

  logForDebugging(
    `contextCollapse persist: restored ${entries.length} commits, ${snapshot ? 'with' : 'without'} snapshot`,
  )
}
