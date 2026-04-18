import React from 'react'
import { render } from 'ink'
import { Repl } from './repl.jsx'
import type { CCLocalClient } from '../client/CCLocalClient.js'

export async function launchRepl(client: CCLocalClient): Promise<void> {
  const { waitUntilExit } = render(React.createElement(Repl, { client }))
  await waitUntilExit()
}
