/**
 * Empty state component shown when no messages
 */

import React from 'react'

export function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <h3 className="empty-title">CCLocal</h3>
      <p className="empty-description">
        Claude Code 本地助手
      </p>
      <div className="empty-tips">
        <div className="tip">
          <span className="tip-icon">💬</span>
          <span className="tip-text">输入消息开始对话</span>
        </div>
        <div className="tip">
          <span className="tip-icon">📝</span>
          <span className="tip-text">选中代码后右键发送</span>
        </div>
        <div className="tip">
          <span className="tip-icon">@</span>
          <span className="tip-text">@符号引用文件</span>
        </div>
      </div>
    </div>
  )
}
