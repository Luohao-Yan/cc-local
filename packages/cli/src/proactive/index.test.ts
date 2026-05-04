import { describe, it, expect, beforeEach } from 'bun:test'
import {
  isProactiveActive,
  isProactivePaused,
  activateProactive,
  deactivateProactive,
  pauseProactive,
  resumeProactive,
  setContextBlocked,
  getNextTickAt,
  getProactiveState,
  getActivationInfo,
  resetConsecutiveTicks,
  recordTick,
  shouldInjectTick,
  configureProactive,
  getProactiveConfig,
} from './index.js'

describe('proactive state management', () => {
  beforeEach(() => {
    // Reset to inactive state before each test
    if (isProactiveActive() || isProactivePaused()) {
      deactivateProactive()
    }
  })

  describe('isProactiveActive', () => {
    it('returns false initially', () => {
      expect(isProactiveActive()).toBe(false)
    })

    it('returns true after activation', () => {
      activateProactive('command')
      expect(isProactiveActive()).toBe(true)
      deactivateProactive()
    })
  })

  describe('isProactivePaused', () => {
    it('returns false when inactive', () => {
      expect(isProactivePaused()).toBe(false)
    })

    it('returns true after pause', () => {
      activateProactive('command')
      pauseProactive()
      expect(isProactivePaused()).toBe(true)
      deactivateProactive()
    })
  })

  describe('activateProactive', () => {
    it('changes state to active', () => {
      activateProactive('command')
      expect(getProactiveState()).toBe('active')
      deactivateProactive()
    })

    it('records activation reason', () => {
      activateProactive('env')
      const info = getActivationInfo()
      expect(info.reason).toBe('env')
      deactivateProactive()
    })

    it('resets consecutive ticks on activation', () => {
      activateProactive('command')
      recordTick()
      recordTick()
      deactivateProactive()
      activateProactive('command')
      const info = getActivationInfo()
      expect(info.consecutiveTicks).toBe(0)
      deactivateProactive()
    })
  })

  describe('deactivateProactive', () => {
    it('changes state to inactive', () => {
      activateProactive('command')
      deactivateProactive()
      expect(getProactiveState()).toBe('inactive')
    })

    it('clears activation info', () => {
      activateProactive('command')
      deactivateProactive()
      const info = getActivationInfo()
      expect(info.reason).toBe(null)
      expect(info.activatedAt).toBe(null)
    })
  })

  describe('pauseProactive', () => {
    it('changes state from active to paused', () => {
      activateProactive('command')
      pauseProactive()
      expect(getProactiveState()).toBe('paused')
      expect(isProactivePaused()).toBe(true)
      deactivateProactive()
    })

    it('does nothing when inactive', () => {
      pauseProactive()
      expect(getProactiveState()).toBe('inactive')
    })
  })

  describe('resumeProactive', () => {
    it('changes state from paused to active', () => {
      activateProactive('command')
      pauseProactive()
      resumeProactive()
      expect(getProactiveState()).toBe('active')
      deactivateProactive()
    })

    it('does nothing when inactive', () => {
      resumeProactive()
      expect(getProactiveState()).toBe('inactive')
    })
  })

  describe('setContextBlocked', () => {
    it('prevents tick injection when blocked', () => {
      activateProactive('command')
      setContextBlocked(true)
      expect(shouldInjectTick()).toBe(false)
      setContextBlocked(false)
      expect(shouldInjectTick()).toBe(true)
      deactivateProactive()
    })
  })

  describe('tick tracking', () => {
    it('recordTick increments counter', () => {
      activateProactive('command')
      recordTick()
      const info = getActivationInfo()
      expect(info.consecutiveTicks).toBe(1)
      deactivateProactive()
    })

    it('resetConsecutiveTicks clears counter', () => {
      activateProactive('command')
      recordTick()
      recordTick()
      resetConsecutiveTicks()
      const info = getActivationInfo()
      expect(info.consecutiveTicks).toBe(0)
      deactivateProactive()
    })
  })

  describe('shouldInjectTick', () => {
    it('returns false when inactive', () => {
      expect(shouldInjectTick()).toBe(false)
    })

    it('returns true when active and not blocked', () => {
      activateProactive('command')
      expect(shouldInjectTick()).toBe(true)
      deactivateProactive()
    })

    it('returns false when paused', () => {
      activateProactive('command')
      pauseProactive()
      expect(shouldInjectTick()).toBe(false)
      deactivateProactive()
    })
  })

  describe('configureProactive', () => {
    it('updates configuration', () => {
      const original = getProactiveConfig()
      configureProactive({ tickIntervalMs: 60000 })
      const updated = getProactiveConfig()
      expect(updated.tickIntervalMs).toBe(60000)
      // Restore original
      configureProactive(original)
    })
  })
})
