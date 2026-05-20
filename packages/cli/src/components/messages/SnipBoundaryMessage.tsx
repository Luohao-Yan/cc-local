/**
 * SnipBoundaryMessage component
 *
 * HISTORY_SNIP feature: renders a visual boundary marker in the
 * conversation transcript where a context snip occurred.
 */

import React from 'react'
import { Box, Text } from '../../ink.js'

type Props = {
  message?: import('../../types/message.js').SystemMessage
}

export function SnipBoundaryMessage(_props: Props = {}) {
  return (
    <Box marginY={1}>
      <Text dimColor>
        {'✂ Context snipped (conversation summarized)'}
      </Text>
    </Box>
  )
}

/**
 * Type guard: check if a system message is a snip boundary.
 */
export function isSnipBoundaryMessage(
  message: import('../../types/message.js').SystemMessage
): boolean {
  return (
    message.type === 'system' &&
    (message as any).subtype === 'snip_boundary'
  )
}
