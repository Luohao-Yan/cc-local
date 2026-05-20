import React from 'react'
import { Box, Text } from '../../ink.js'
import { FORK_BOILERPLATE_TAG } from '../../constants/xml.js'
import { extractTag } from '../../utils/messages.js'
import { UserPromptMessage } from './UserPromptMessage.js'

type Props = {
  addMargin: boolean
  param: { text: string }
}

export function UserForkBoilerplateMessage({ addMargin, param }: Props): React.ReactNode {
  const boilerplate = extractTag(param.text, FORK_BOILERPLATE_TAG)
  const remaining = param.text.replace(`<${FORK_BOILERPLATE_TAG}>${boilerplate}</${FORK_BOILERPLATE_TAG}>`, '').trim()

  return (
    <Box flexDirection="column" marginTop={addMargin ? 1 : 0}>
      {boilerplate && (
        <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
          <Text dimColor>{boilerplate}</Text>
        </Box>
      )}
      {remaining && (
        <UserPromptMessage addMargin={false} param={{ text: remaining, type: 'text' }} />
      )}
    </Box>
  )
}
