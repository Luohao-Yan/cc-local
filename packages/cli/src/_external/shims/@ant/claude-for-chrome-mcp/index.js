'use strict'

/** @type {Array<{ name: string }>} */
const BROWSER_TOOLS = []

function createClaudeForChromeMcpServer(_context) {
  return {
    setRequestHandler() {},
    async connect() {},
  }
}

module.exports = {
  BROWSER_TOOLS,
  createClaudeForChromeMcpServer,
}
