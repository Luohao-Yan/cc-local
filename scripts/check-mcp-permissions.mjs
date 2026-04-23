#!/usr/bin/env bun

import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { connectToServer } from '../src/services/mcp/client.ts'
import { subprocessEnv } from '../src/utils/subprocessEnv.ts'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cclocal-mcp-permissions-'))
const projectDir = path.join(tempRoot, 'project')
const testFile = path.join(projectDir, 'editable.txt')
const distCliPath = path.join(process.cwd(), 'dist', 'cli.js')
const realProjectDir = await (async () => {
  await mkdir(projectDir, { recursive: true })
  return await realpath(projectDir)
})()

await writeFile(testFile, 'before\n', 'utf8')

const originalCwd = process.cwd()
process.chdir(projectDir)

const connection = await connectToServer('official_stdio', {
  type: 'stdio',
  command: 'bun',
  args: [distCliPath, 'mcp', 'serve'],
  env: subprocessEnv(),
  scope: 'project',
})

try {
  assert(connection.type === 'connected', `expected connected result, got ${connection.type}`)

  const readResult = await connection.client.callTool(
    {
      name: 'Read',
      arguments: {
        file_path: testFile,
      },
    },
    CallToolResultSchema,
  )

  const readText = (readResult.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  assert(!readResult.isError, 'expected Read tool call to succeed before Edit')
  assert(readText.includes('"content":"before\\n"'), 'expected Read tool to report initial file content')

  const bashResult = await connection.client.callTool(
    {
      name: 'Bash',
      arguments: {
        command: 'pwd',
      },
    },
    CallToolResultSchema,
  )

  const bashText = (bashResult.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  assert(bashText.includes(`"stdout":"${realProjectDir}`), 'expected Bash tool to execute in project cwd')

  const editResult = await connection.client.callTool(
    {
      name: 'Edit',
      arguments: {
        file_path: testFile,
        old_string: 'before\n',
        new_string: 'after\n',
      },
    },
    CallToolResultSchema,
  )

  const editText = (editResult.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  assert(!editResult.isError, 'expected Edit tool call to succeed after prior Read')
  assert(editText.includes('"newString":"after\\n"'), 'expected Edit tool to report updated content')

  const writeResult = await connection.client.callTool(
    {
      name: 'Write',
      arguments: {
        file_path: testFile,
        content: 'rewritten\n',
      },
    },
    CallToolResultSchema,
  )

  const writeText = (writeResult.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  assert(!writeResult.isError, 'expected Write tool call to succeed')
  assert(writeText.includes('"content":"rewritten\\n"'), 'expected Write tool to report rewritten content')

  const finalFile = await readFile(testFile, 'utf8')
  assert(finalFile === 'rewritten\n', 'expected Write tool to persist final file content')

  process.stdout.write(`${JSON.stringify({
    readPreview: readText,
    bashPreview: bashText,
    editPreview: editText,
    writePreview: writeText,
    finalFile,
  }, null, 2)}\n`)
} finally {
  if (connection.type === 'connected') {
    await connection.cleanup().catch(() => {})
  }
  process.chdir(originalCwd)
  await rm(tempRoot, { recursive: true, force: true }).catch(() => {})
}
