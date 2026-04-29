import * as React from 'react'
import { Text } from '../../ink.js'
import type { AgentMemoryScope } from '../../tools/AgentTool/agentMemory.js'

export function buildMergePrompt(
  _agentType: string,
  _scope: AgentMemoryScope,
): string {
  return ''
}

export type SnapshotUpdateDialogProps = {
  agentType: string
  scope: AgentMemoryScope
  snapshotTimestamp: string
  onComplete: (choice: 'merge' | 'keep' | 'replace') => void
  onCancel: () => void
}

/** Stub dialog — immediately resolves with `keep` so flows can proceed. */
export function SnapshotUpdateDialog(props: SnapshotUpdateDialogProps): React.ReactElement {
  React.useEffect(() => {
    props.onComplete('keep')
    // Stub: one-shot completion; avoid re-firing when parent recreates callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stub
  }, [])
  return React.createElement(Text, null, 'Snapshot update (stub)')
}
