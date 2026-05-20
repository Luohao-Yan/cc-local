/**
 * Webview Message Types Tests
 *
 * Tests the new from-extension wrapper pattern where
 * all CLI messages are wrapped: { type: "from-extension", message: <CLI message> }
 */

import { describe, it, expect } from 'vitest'
import type {
  WebviewToExtensionMessage,
  ExtensionToWebviewMessage,
  CliContentBlockDeltaMessage,
  CliControlRequestMessage,
  CliProposedDiffMessage,
  CliUsageUpdateMessage,
  CliMcpStatusMessage,
  CliSessionStatesUpdateMessage,
} from '../types.js'
import { CLI_MESSAGE_TYPES, EXT_REQUEST_TYPES } from '../types.js'

describe('WebviewToExtensionMessage Types', () => {
  it('should type check submit', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'submit',
      text: 'Hello',
    }
    expect(msg.type).toBe('submit')
  })

  it('should type check stopGeneration', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'stopGeneration',
    }
    expect(msg.type).toBe('stopGeneration')
  })

  it('should type check newSession', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'newSession',
    }
    expect(msg.type).toBe('newSession')
  })

  it('should type check ready', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'ready',
    }
    expect(msg.type).toBe('ready')
  })

  it('should type check permissionResponse', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'permissionResponse',
      requestId: 'test-123',
      approved: true,
    }
    expect(msg.type).toBe('permissionResponse')
  })

  it('should type check permissionResponse with always', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'permissionResponse',
      requestId: 'test-123',
      approved: true,
      always: true,
    }
    expect(msg.always).toBe(true)
  })

  it('should type check setModel', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'setModel',
      model: 'claude-4-sonnet',
    }
    expect(msg.type).toBe('setModel')
  })

  it('should type check openFile', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'openFile',
      path: '/test/file.ts',
    }
    expect(msg.type).toBe('openFile')
  })

  it('should type check login', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'login',
    }
    expect(msg.type).toBe('login')
  })

  it('should type check getContextUsage', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'getContextUsage',
    }
    expect(msg.type).toBe('getContextUsage')
  })

  it('should type check getMcpServers', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'getMcpServers',
    }
    expect(msg.type).toBe('getMcpServers')
  })

  it('should type check newTab', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'newTab',
    }
    expect(msg.type).toBe('newTab')
  })

  it('should type check listSessions', () => {
    const msg: WebviewToExtensionMessage = {
      type: 'listSessions',
    }
    expect(msg.type).toBe('listSessions')
  })
})

describe('ExtensionToWebviewMessage Types (from-extension pattern)', () => {
  it('should type check from-extension wrapper with text_delta', () => {
    const cliMsg: CliContentBlockDeltaMessage = {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'Hello' },
      session_id: 'sess-1',
      message_id: 'msg-123',
    }
    const msg: ExtensionToWebviewMessage = {
      type: 'from-extension',
      message: cliMsg,
    }
    expect(msg.type).toBe('from-extension')
    expect(msg.message.type).toBe('content_block_delta')
  })

  it('should type check from-extension wrapper with control_request', () => {
    const cliMsg: CliControlRequestMessage = {
      type: 'control_request',
      request_id: 'req-1',
      request: {
        subtype: 'tool_permission',
        tool_name: 'Bash',
        tool_input: { command: 'ls' },
      },
      session_id: 'sess-1',
    }
    const msg: ExtensionToWebviewMessage = {
      type: 'from-extension',
      message: cliMsg,
    }
    expect(msg.message.type).toBe('control_request')
  })

  it('should type check from-extension wrapper with proposed_diff', () => {
    const cliMsg: CliProposedDiffMessage = {
      type: 'proposed_diff',
      file_path: '/test/file.ts',
      old_content: 'old',
      new_content: 'new',
      session_id: 'sess-1',
    }
    const msg: ExtensionToWebviewMessage = {
      type: 'from-extension',
      message: cliMsg,
    }
    expect(msg.message.type).toBe('proposed_diff')
  })

  it('should type check from-extension wrapper with usage_update', () => {
    const cliMsg: CliUsageUpdateMessage = {
      type: 'usage_update',
      cost_usd: 0.0025,
      duration_ms: 1500,
    }
    const msg: ExtensionToWebviewMessage = {
      type: 'from-extension',
      message: cliMsg,
    }
    expect(msg.message.type).toBe('usage_update')
  })

  it('should type check from-extension wrapper with mcp_status', () => {
    const cliMsg: CliMcpStatusMessage = {
      type: 'mcp_status',
      servers: [{ name: 'test', status: 'connected' }],
    }
    const msg: ExtensionToWebviewMessage = {
      type: 'from-extension',
      message: cliMsg,
    }
    expect(msg.message.type).toBe('mcp_status')
  })

  it('should type check from-extension wrapper with session_states_update', () => {
    const cliMsg: CliSessionStatesUpdateMessage = {
      type: 'session_states_update',
      sessions: [{ session_id: 's1', status: 'idle' }],
    }
    const msg: ExtensionToWebviewMessage = {
      type: 'from-extension',
      message: cliMsg,
    }
    expect(msg.message.type).toBe('session_states_update')
  })

  it('should type check statusChange', () => {
    const msg: ExtensionToWebviewMessage = {
      type: 'statusChange',
      status: 'connected',
    }
    expect(msg.type).toBe('statusChange')
  })

  it('should type check cliConnected', () => {
    const msg: ExtensionToWebviewMessage = {
      type: 'cliConnected',
      version: '2.1.89',
      model: 'claude-4-sonnet',
    }
    expect(msg.type).toBe('cliConnected')
  })

  it('should type check cliDisconnected', () => {
    const msg: ExtensionToWebviewMessage = {
      type: 'cliDisconnected',
    }
    expect(msg.type).toBe('cliDisconnected')
  })

  it('should type check channelUpdate', () => {
    const msg: ExtensionToWebviewMessage = {
      type: 'channelUpdate',
      channels: [],
    }
    expect(msg.type).toBe('channelUpdate')
  })

  it('should type check error', () => {
    const msg: ExtensionToWebviewMessage = {
      type: 'error',
      message: 'Something went wrong',
    }
    expect(msg.type).toBe('error')
  })

  it('should type check fileSuggestionsResult', () => {
    const msg: ExtensionToWebviewMessage = {
      type: 'fileSuggestionsResult',
      files: ['src/index.ts'],
    }
    expect(msg.type).toBe('fileSuggestionsResult')
  })

  it('should type check sessionsList', () => {
    const msg: ExtensionToWebviewMessage = {
      type: 'sessionsList',
      sessions: [],
    }
    expect(msg.type).toBe('sessionsList')
  })

  it('should type check modelChange', () => {
    const msg: ExtensionToWebviewMessage = {
      type: 'modelChange',
      model: 'claude-4-opus',
    }
    expect(msg.type).toBe('modelChange')
  })

  it('should type check authStatusChange', () => {
    const msg: ExtensionToWebviewMessage = {
      type: 'authStatusChange',
      status: { loggedIn: true, method: 'cclocal' },
    }
    expect(msg.type).toBe('authStatusChange')
  })
})

describe('CLI Message Types Coverage', () => {
  it('should have all CLI message types in the set', () => {
    expect(CLI_MESSAGE_TYPES.has('init')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('assistant')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('content_block_start')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('content_block_delta')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('content_block_stop')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('result')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('thinking')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('text')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('tool_use')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('tool_result')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('control_request')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('proposed_diff')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('usage_update')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('mcp_status')).toBe(true)
    expect(CLI_MESSAGE_TYPES.has('session_states_update')).toBe(true)
  })

  it('should have all Extension request types in the set', () => {
    expect(EXT_REQUEST_TYPES.has('init')).toBe(true)
    expect(EXT_REQUEST_TYPES.has('login')).toBe(true)
    expect(EXT_REQUEST_TYPES.has('set_model')).toBe(true)
    expect(EXT_REQUEST_TYPES.has('tool_permission_response')).toBe(true)
    expect(EXT_REQUEST_TYPES.has('open_file')).toBe(true)
    expect(EXT_REQUEST_TYPES.has('open_diff')).toBe(true)
    expect(EXT_REQUEST_TYPES.has('get_mcp_servers')).toBe(true)
    expect(EXT_REQUEST_TYPES.has('insert_at_mention')).toBe(true)
    expect(EXT_REQUEST_TYPES.has('toggle_dictation')).toBe(true)
    expect(EXT_REQUEST_TYPES.has('list_plugins')).toBe(true)
  })
})