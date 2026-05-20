/**
 * CommentManager — Manages comments on plans and diffs.
 *
 * 1:1 match with official Claude Code extension's comment system.
 * Comments can be added, removed, and listed for any plan or diff.
 * State is persisted per session via in-memory store (cleared on session end).
 */

import * as vscode from 'vscode'
import * as crypto from 'crypto'

export interface Comment {
  id: string
  /** The resource this comment belongs to (plan ID or diff file path) */
  resourceId: string
  /** Comment text */
  text: string
  /** ISO timestamp when created */
  createdAt: string
  /** Optional: line range for diff comments */
  range?: { startLine: number; endLine: number }
  /** Optional: author (default: "You") */
  author?: string
}

export class CommentManager implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  /** Session-scoped comment store: sessionId → resourceId → Comment[] */
  private comments = new Map<string, Map<string, Comment[]>>()
  /** Change emitter for webview updates */
  private _onDidChangeComments = new vscode.EventEmitter<{ sessionId: string; resourceId: string }>()
  readonly onDidChangeComments = this._onDidChangeComments.event

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel
  }

  /** Add a comment to a resource (plan/diff) */
  addComment(sessionId: string, resourceId: string, text: string, range?: { startLine: number; endLine: number }): Comment {
    const comment: Comment = {
      id: crypto.randomUUID(),
      resourceId,
      text,
      createdAt: new Date().toISOString(),
      range,
      author: 'You',
    }

    const sessionComments = this.getOrCreateSession(sessionId)
    const resourceComments = sessionComments.get(resourceId) ?? []
    resourceComments.push(comment)
    sessionComments.set(resourceId, resourceComments)

    this.outputChannel.debug(`[Comments] Added comment ${comment.id} to ${resourceId} (session: ${sessionId})`)
    this._onDidChangeComments.fire({ sessionId, resourceId })
    return comment
  }

  /** Remove a specific comment by ID */
  removeComment(sessionId: string, resourceId: string, commentId: string): boolean {
    const sessionComments = this.comments.get(sessionId)
    if (!sessionComments) return false

    const resourceComments = sessionComments.get(resourceId)
    if (!resourceComments) return false

    const index = resourceComments.findIndex(c => c.id === commentId)
    if (index === -1) return false

    resourceComments.splice(index, 1)
    this.outputChannel.debug(`[Comments] Removed comment ${commentId} from ${resourceId}`)
    this._onDidChangeComments.fire({ sessionId, resourceId })
    return true
  }

  /** Get all comments for a resource */
  getComments(sessionId: string, resourceId: string): Comment[] {
    const sessionComments = this.comments.get(sessionId)
    if (!sessionComments) return []
    return sessionComments.get(resourceId) ?? []
  }

  /** Get comment count for a resource */
  getCommentCount(sessionId: string, resourceId: string): number {
    return this.getComments(sessionId, resourceId).length
  }

  /** Get all comments for a session (across all resources) */
  getAllCommentsForSession(sessionId: string): Map<string, Comment[]> {
    return this.comments.get(sessionId) ?? new Map()
  }

  /** Clear all comments for a session */
  clearSession(sessionId: string): void {
    this.comments.delete(sessionId)
    this.outputChannel.debug(`[Comments] Cleared all comments for session ${sessionId}`)
  }

  /** Check if comments are enabled (always true in our implementation) */
  isCommentsEnabled(): boolean {
    return true
  }

  /** Set comments enabled state (for API compatibility) */
  setCommentsEnabled(_enabled: boolean): void {
    // Always enabled in our implementation
  }

  private getOrCreateSession(sessionId: string): Map<string, Comment[]> {
    let sessionComments = this.comments.get(sessionId)
    if (!sessionComments) {
      sessionComments = new Map()
      this.comments.set(sessionId, sessionComments)
    }
    return sessionComments
  }

  dispose(): void {
    this.comments.clear()
    this._onDidChangeComments.dispose()
  }
}
