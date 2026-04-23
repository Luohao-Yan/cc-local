#!/usr/bin/env bun

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { connectToServer } from '../src/services/mcp/client.ts'
import { subprocessEnv } from '../src/utils/subprocessEnv.ts'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distCliPath = path.join(rootDir, 'dist', 'cli.js')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cclocal-mcp-serve-'))
const testProject = path.join(tempRoot, 'project')
const testFile = path.join(testProject, 'sample.txt')

await Bun.$`mkdir -p ${testProject}`.quiet()
await writeFile(testFile, 'alpha\nbeta\ngamma\n', 'utf8')

const connection = await connectToServer('official_stdio', {
  type: 'stdio',
  command: 'bun',
  args: [distCliPath, 'mcp', 'serve'],
  env: subprocessEnv(),
  scope: 'project',
})

try {
  assert(connection.type === 'connected', `expected connected result, got ${connection.type}`)

  const listResult = await connection.client.listTools()
  const toolNames = listResult.tools.map(tool => tool.name).sort()

  assert(toolNames.length >= 5, `expected at least 5 tools, got ${toolNames.length}`)
  assert(toolNames.includes('Read'), 'expected mcp serve to expose Read tool')
  assert(toolNames.includes('Bash'), 'expected mcp serve to expose Bash tool')

  const readResult = await connection.client.callTool(
    {
      name: 'Read',
      arguments: {
        file_path: testFile,
      },
    },
    CallToolResultSchema,
  )

  assert(!readResult.isError, 'expected Read tool call to succeed')

  const textContent = (readResult.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  assert(textContent.includes('"content":"alpha\\nbeta\\ngamma\\n"'), 'expected Read output to contain file content payload')
  assert(textContent.includes(`"filePath":"${testFile}`), 'expected Read output to contain requested file path')

  process.stdout.write(`${JSON.stringify({
    toolCount: toolNames.length,
    toolNames,
    readPreview: textContent.slice(0, 200),
  }, null, 2)}\n`)
} finally {
  if (connection.type === 'connected') {
    await connection.cleanup().catch(() => {})
  }
  await rm(tempRoot, { recursive: true, force: true }).catch(() => {})
}
