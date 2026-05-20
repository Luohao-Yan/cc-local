import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import React from 'react'
import { Box, Text } from '../../ink.js'
import { FORK_BOILERPLATE_TAG, FORK_DIRECTIVE_PREFIX } from '../../constants/xml.js'
import { extractTag } from '../../utils/messages.js'
import { UserPromptMessage } from './UserPromptMessage.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

export function UserForkBoilerplateMessage({ addMargin, param }: Props): React.ReactNode {
  const boilerplate = extractTag(param.text, FORK_BOILERPLATE_TAG)
  if (!boilerplate) return null

  const directiveStart = boilerplate.indexOf(FORK_DIRECTIVE_PREFIX)
  const directive = directiveStart !== -1
    ? boilerplate.slice(directiveStart + FORK_DIRECTIVE_PREFIX.length).trim()
    : null

  const stripped = param.text
    .replace(`<${FORK_BOILERPLATE_TAG}>${boilerplate}</${FORK_BOILERPLATE_TAG}>`, '')
    .trim()

  return (
    <Box flexDirection="column" marginTop={addMargin ? 1 : 0}>
      {directive ? (
        <Box flexDirection="column">
          <Text dimColor>↳ Fork boilerplate collapsed</Text>
          <Text bold>{directive}</Text>
        </Box>
      ) : (
        <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
          <Text dimColor>{boilerplate.length > 300 ? boilerplate.slice(0, 297) + '...' : boilerplate}</Text>
        </Box>
      )}
      {stripped && (
        <UserPromptMessage addMargin={false} param={{ text: stripped, type: 'text' }} />
      )}
    </Box>
  )
}
