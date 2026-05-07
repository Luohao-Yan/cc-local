/**
 * Error block component
 */

import React from 'react'
import type { ErrorBlock } from '../types'

interface ErrorBlockComponentProps {
  block: ErrorBlock
}

export function ErrorBlockComponent({ block }: ErrorBlockComponentProps) {
  return (
    <div className="error-block">
      <div className="error-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span className="error-label">Error</span>
      </div>
      <div className="error-content">
        {block.text}
      </div>
    </div>
  )
}
