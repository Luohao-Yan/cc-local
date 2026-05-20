import { useEffect, useCallback } from 'react'
import { useAppSelector } from '../../store/hooks'
import type { PermissionRequest } from '../../store/slices/uiSlice'
import './PermissionDialog.css'

interface PermissionDialogProps {
  onRespond: (requestId: string, approved: boolean, always?: boolean) => void
}

function PermissionDialog({ onRespond }: PermissionDialogProps) {
  const currentPermission = useAppSelector(state => state.ui.currentPermission) as PermissionRequest | null

  const handleAllow = useCallback(() => {
    if (currentPermission) onRespond(currentPermission.id, true, false)
  }, [currentPermission, onRespond])

  const handleAlways = useCallback(() => {
    if (currentPermission) onRespond(currentPermission.id, true, true)
  }, [currentPermission, onRespond])

  const handleDeny = useCallback(() => {
    if (currentPermission) onRespond(currentPermission.id, false, false)
  }, [currentPermission, onRespond])

  // 键盘快捷键: Y=Allow, A=Always, N/D=Deny
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'y' || e.key === 'Y') handleAllow()
      else if (e.key === 'a' || e.key === 'A') handleAlways()
      else if (e.key === 'n' || e.key === 'N' || e.key === 'd' || e.key === 'D') handleDeny()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleAllow, handleAlways, handleDeny])

  if (!currentPermission) return null

  const typeLabel = currentPermission.type === 'tool' ? 'Tool'
    : currentPermission.type === 'file' ? 'File'
    : currentPermission.type === 'command' ? 'Command'
    : currentPermission.type === 'mcp' ? 'MCP'
    : 'Permission'

  return (
    <div className="permission-dialog-overlay">
      <div className="permission-dialog">
        <div className="permission-dialog-header">
          <h3>
            <span className="permission-dialog-header-icon">🔐</span>
            Permission Request
          </h3>
          <span className="permission-dialog-type">{typeLabel}</span>
        </div>

        <div className="permission-dialog-body">
          <p>{currentPermission.message}</p>

          {currentPermission.details && (
            <div className="permission-dialog-details">
              <pre>{typeof currentPermission.details === 'string'
                ? currentPermission.details
                : JSON.stringify(currentPermission.details, null, 2)
              }</pre>
            </div>
          )}

          <div className="permission-dialog-warning">
            <span className="permission-dialog-warning-icon">⚠</span>
            <span>Only approve if you trust this request.</span>
          </div>
        </div>

        <div className="permission-dialog-actions">
          <button
            className="permission-dialog-button deny"
            onClick={handleDeny}
            title="Deny (N)"
          >
            Deny
          </button>
          <button
            className="permission-dialog-button allow-for-session"
            onClick={handleAlways}
            title="Always Allow (A)"
          >
            Always Allow
          </button>
          <button
            className="permission-dialog-button allow"
            onClick={handleAllow}
            title="Allow (Y)"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  )
}

export default PermissionDialog
