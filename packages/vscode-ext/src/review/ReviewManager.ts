/**
 * ReviewManager — Manages code review workflow.
 *
 * 1:1 match with official Claude Code extension's review system.
 * Handles review requests, review responses, and review upsell banner.
 */

import * as vscode from 'vscode'
import * as crypto from 'crypto'
import type { GlobalStateManager } from '../GlobalStateManager.js'

export interface ReviewRequest {
  id: string
  sessionId: string
  /** Code changes to review */
  filePaths: string[]
  /** Review type */
  type: 'full' | 'diff' | 'quick'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: string
  completedAt?: string
}

export interface ReviewResponse {
  requestId: string
  /** Overall assessment */
  summary: string
  /** Per-file findings */
  findings: Array<{
    filePath: string
    line?: number
    severity: 'info' | 'warning' | 'error'
    message: string
    suggestion?: string
  }>
  /** Suggested action */
  action?: 'approve' | 'request_changes' | 'comment'
}

export class ReviewManager implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  private globalStateManager: GlobalStateManager | null
  /** Active review requests by session */
  private activeReviews = new Map<string, ReviewRequest>()
  /** Completed review responses by request ID */
  private reviewResponses = new Map<string, ReviewResponse>()
  /** Event emitter */
  private _onDidChangeReview = new vscode.EventEmitter<{ sessionId: string; requestId?: string }>()
  readonly onDidChangeReview = this._onDidChangeReview.event

  constructor(outputChannel: vscode.LogOutputChannel, globalStateManager?: GlobalStateManager) {
    this.outputChannel = outputChannel
    this.globalStateManager = globalStateManager ?? null
  }

  /** Create a review request */
  createReviewRequest(sessionId: string, filePaths: string[], type: 'full' | 'diff' | 'quick' = 'full'): ReviewRequest {
    const request: ReviewRequest = {
      id: crypto.randomUUID(),
      sessionId,
      filePaths,
      type,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    this.activeReviews.set(request.id, request)
    this.outputChannel.info(`[Review] Created review request ${request.id} for ${filePaths.length} file(s)`)
    this._onDidChangeReview.fire({ sessionId, requestId: request.id })
    return request
  }

  /** Update review status */
  updateReviewStatus(requestId: string, status: ReviewRequest['status']): boolean {
    const request = this.activeReviews.get(requestId)
    if (!request) return false

    request.status = status
    if (status === 'completed' || status === 'cancelled') {
      request.completedAt = new Date().toISOString()
    }

    this._onDidChangeReview.fire({ sessionId: request.sessionId, requestId })
    return true
  }

  /** Store a review response */
  storeReviewResponse(response: ReviewResponse): void {
    this.reviewResponses.set(response.requestId, response)
    // Update the request status
    this.updateReviewStatus(response.requestId, 'completed')
    this.outputChannel.info(`[Review] Stored response for ${response.requestId}: ${response.findings.length} findings`)
  }

  /** Get active review for a session */
  getActiveReview(sessionId: string): ReviewRequest | undefined {
    for (const [, request] of this.activeReviews) {
      if (request.sessionId === sessionId && request.status === 'in_progress') {
        return request
      }
    }
    return undefined
  }

  /** Get review response */
  getReviewResponse(requestId: string): ReviewResponse | undefined {
    return this.reviewResponses.get(requestId)
  }

  /** Check if review upsell banner should be shown */
  shouldShowReviewUpsell(): boolean {
    if (!this.globalStateManager) return true

    // Dismiss after 3 times
    const dismissed = this.globalStateManager.reviewUpsellDismissed
    if (dismissed && dismissed.count >= 3) return false

    // Don't show more than once per hour
    const lastShown = this.globalStateManager.reviewUpsellLastShown
    if (Date.now() - lastShown < 3600_000) return false

    return true
  }

  /** Dismiss the review upsell banner */
  async dismissReviewUpsell(): Promise<void> {
    await this.globalStateManager?.dismissReviewUpsell()
    await this.globalStateManager?.setReviewUpsellLastShown()
  }

  /** Get all review requests for a session */
  getSessionReviews(sessionId: string): ReviewRequest[] {
    const reviews: ReviewRequest[] = []
    for (const [, request] of this.activeReviews) {
      if (request.sessionId === sessionId) {
        reviews.push(request)
      }
    }
    return reviews
  }

  /** Cancel all pending reviews for a session */
  cancelSessionReviews(sessionId: string): void {
    for (const [id, request] of this.activeReviews) {
      if (request.sessionId === sessionId && request.status === 'pending') {
        request.status = 'cancelled'
        request.completedAt = new Date().toISOString()
        this.outputChannel.debug(`[Review] Cancelled review ${id}`)
      }
    }
  }

  dispose(): void {
    this.activeReviews.clear()
    this.reviewResponses.clear()
    this._onDidChangeReview.dispose()
  }
}
