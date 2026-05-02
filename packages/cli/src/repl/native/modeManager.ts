/**
 * Mode manager for native REPL
 *
 * Manages the permission/interaction mode:
 *  - default: ask for permission on each tool
 *  - auto: auto-approve all tools
 *  - plan: only allow read-only tools
 *
 * Also tracks token usage and cost for the status line.
 */

import type { PermissionMode } from '@cclocal/shared'

export type InteractionMode = 'default' | 'auto' | 'plan'

export interface ModeState {
  mode: InteractionMode
  permissionMode: PermissionMode
  tokensUsed: number
  tokensLimit: number
  costUsd: number
  turnCount: number
}

export function createModeManager(initialPermissionMode: PermissionMode = 'default'): {
  getState: () => ModeState
  setMode: (mode: InteractionMode) => void
  addTokens: (used: number) => void
  addCost: (cost: number) => void
  incrementTurn: () => void
  toPermissionMode: () => PermissionMode
} {
  const state: ModeState = {
    mode: 'default',
    permissionMode: initialPermissionMode,
    tokensUsed: 0,
    tokensLimit: 200000,
    costUsd: 0,
    turnCount: 0,
  }

  return {
    getState() {
      return { ...state }
    },

    setMode(mode: InteractionMode) {
      state.mode = mode
      state.permissionMode =
        mode === 'auto' ? 'auto' :
        mode === 'plan' ? 'plan' :
        initialPermissionMode
    },

    addTokens(used: number) {
      state.tokensUsed += used
    },

    addCost(cost: number) {
      state.costUsd += cost
    },

    incrementTurn() {
      state.turnCount++
    },

    toPermissionMode(): PermissionMode {
      return state.permissionMode
    },
  }
}
