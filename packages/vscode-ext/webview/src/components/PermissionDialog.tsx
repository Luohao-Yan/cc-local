/**
 * Permission dialog component
 */

import React, { useState } from 'react'
import type { PermissionRequest } from '../types'

interface PermissionDialogProps {
  request: PermissionRequest
  onDecision: (behavior: 'allow' | 'deny', always?: boolean) => void
}

const RISK_COLORS = {
  low: 'var(--success-color, #a6e3a1)',
  medium: 'var(--warning-color, #f9e2af)',
  high: 'var(--error-color, #f38ba8)',
}

const RISK_LABELS = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
}

export function PermissionDialog({ request, onDecision }: PermissionDialogProps) {
  const [selectedBehavior, setSelectedBehavior] = useState<'allow' | 'deny' | null>(null)
  const [always, setAlways] = useState(false)

  const handleDecision = (behavior: 'allow' | 'deny') => {
    onDecision(behavior, always)
  }

  // Format tool input for display
  const formatInput = () => {
    if (!request.toolInput) return 'No input'

    try {
      return JSON.stringify(request.toolInput, null, 2)
    } catch {
      return String(request.toolInput)
    }
  }

  return (
    <div className="permission-overlay">
      <div className="permission-dialog">
        <div className="permission-header">
          <h3>Permission Required</h3>
          <div
            className="risk-badge"
            style={{ backgroundColor: RISK_COLORS[request.riskLevel] }}
          >
            {RISK_LABELS[request.riskLevel]}
          </div>
        </div>

        <div className="permission-body">
          <div className="tool-info">
            <span className="tool-name">{request.toolName}</span>
            <span className="tool-description">{request.description}</span>
          </div>

          <div className="permission-input">
            <h4>Tool Input</h4>
            <pre>{formatInput()}</pre>
          </div>

          <div className="permission-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={always}
                onChange={(e) => setAlways(e.target.checked)}
              />
              <span>Always allow this tool</span>
            </label>
          </div>
        </div>

        <div className="permission-actions">
          <button
            className="permission-btn deny"
            onClick={() => handleDecision('deny')}
          >
            Deny
          </button>
          <button
            className="permission-btn allow"
            onClick={() => handleDecision('allow')}
          >
            {always ? 'Always Allow' : 'Allow Once'}
          </button>
        </div>
      </div>
    </div>
  )
}
