/**
 * Status indicator component
 */

import React from 'react'
import type { CclocalStatus } from '../types'

interface StatusIndicatorProps {
  status: CclocalStatus
}

const STATUS_CONFIG: Record<CclocalStatus, {
  icon: React.ReactNode
  label: string
  className: string
}> = {
  idle: {
    icon: '○',
    label: 'Ready',
    className: 'idle',
  },
  connecting: {
    icon: '◐',
    label: 'Connecting...',
    className: 'connecting',
  },
  connected: {
    icon: '●',
    label: 'Connected',
    className: 'connected',
  },
  running: {
    icon: '◑',
    label: 'Generating...',
    className: 'running',
  },
  stopped: {
    icon: '○',
    label: 'Stopped',
    className: 'stopped',
  },
  error: {
    icon: '✕',
    label: 'Error',
    className: 'error',
  },
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status]

  return (
    <div className={`status-indicator ${config.className}`}>
      <span className="status-icon">{config.icon}</span>
      <span className="status-label">{config.label}</span>
      {status === 'running' && (
        <div className="status-spinner">
          <div className="spinner-ring"></div>
        </div>
      )}
    </div>
  )
}
