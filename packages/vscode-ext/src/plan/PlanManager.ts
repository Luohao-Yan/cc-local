/**
 * PlanManager — Manages plan preview, plan comments, and plan mode.
 *
 * 1:1 match with official Claude Code extension's plan system.
 * Plans are created by Claude during "plan" permission mode,
 * displayed in a preview panel, and can have comments added/removed.
 */

import * as vscode from 'vscode'
import * as crypto from 'crypto'

export interface Plan {
  id: string
  sessionId: string
  /** Plan content (markdown) */
  content: string
  /** Plan title */
  title: string
  status: 'draft' | 'preview' | 'accepted' | 'rejected'
  createdAt: string
  updatedAt: string
}

export interface PlanComment {
  id: string
  planId: string
  text: string
  createdAt: string
  author: string
}

export class PlanManager implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  /** Active plans by session */
  private plans = new Map<string, Plan>()
  /** Plan comments: planId → PlanComment[] */
  private planComments = new Map<string, PlanComment[]>()
  /** Currently previewed plan */
  private currentPreviewPlanId: string | null = null
  /** Event emitters */
  private _onDidChangePlan = new vscode.EventEmitter<{ sessionId: string; planId: string }>()
  readonly onDidChangePlan = this._onDidChangePlan.event
  private _onDidClosePreview = new vscode.EventEmitter<string>()
  readonly onDidClosePreview = this._onDidClosePreview.event

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel
  }

  /** Create a new plan */
  createPlan(sessionId: string, content: string, title: string = 'Plan'): Plan {
    const plan: Plan = {
      id: crypto.randomUUID(),
      sessionId,
      content,
      title,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.plans.set(plan.id, plan)
    this.outputChannel.info(`[Plan] Created plan ${plan.id} for session ${sessionId}`)
    this._onDidChangePlan.fire({ sessionId, planId: plan.id })
    return plan
  }

  /** Show plan preview */
  showPreview(planId: string): boolean {
    const plan = this.plans.get(planId)
    if (!plan) return false

    plan.status = 'preview'
    plan.updatedAt = new Date().toISOString()
    this.currentPreviewPlanId = planId
    this.outputChannel.info(`[Plan] Showing preview for plan ${planId}`)
    this._onDidChangePlan.fire({ sessionId: plan.sessionId, planId })
    return true
  }

  /** Close plan preview */
  closePreview(planId: string): void {
    if (this.currentPreviewPlanId === planId) {
      this.currentPreviewPlanId = null
    }
    this._onDidClosePreview.fire(planId)
    this.outputChannel.debug(`[Plan] Closed preview for plan ${planId}`)
  }

  /** Accept a plan */
  acceptPlan(planId: string): boolean {
    const plan = this.plans.get(planId)
    if (!plan) return false

    plan.status = 'accepted'
    plan.updatedAt = new Date().toISOString()
    this.currentPreviewPlanId = null
    this.outputChannel.info(`[Plan] Accepted plan ${planId}`)
    this._onDidChangePlan.fire({ sessionId: plan.sessionId, planId })
    return true
  }

  /** Reject a plan */
  rejectPlan(planId: string): boolean {
    const plan = this.plans.get(planId)
    if (!plan) return false

    plan.status = 'rejected'
    plan.updatedAt = new Date().toISOString()
    this.currentPreviewPlanId = null
    this.outputChannel.info(`[Plan] Rejected plan ${planId}`)
    this._onDidChangePlan.fire({ sessionId: plan.sessionId, planId })
    return true
  }

  /** Add a comment to a plan */
  addPlanComment(planId: string, text: string): PlanComment | null {
    const plan = this.plans.get(planId)
    if (!plan) return null

    const comment: PlanComment = {
      id: crypto.randomUUID(),
      planId,
      text,
      createdAt: new Date().toISOString(),
      author: 'You',
    }

    const comments = this.planComments.get(planId) ?? []
    comments.push(comment)
    this.planComments.set(planId, comments)

    this.outputChannel.debug(`[Plan] Added comment ${comment.id} to plan ${planId}`)
    this._onDidChangePlan.fire({ sessionId: plan.sessionId, planId })
    return comment
  }

  /** Remove a comment from a plan */
  removePlanComment(planId: string, commentId: string): boolean {
    const comments = this.planComments.get(planId)
    if (!comments) return false

    const index = comments.findIndex(c => c.id === commentId)
    if (index === -1) return false

    comments.splice(index, 1)
    const plan = this.plans.get(planId)
    if (plan) {
      this._onDidChangePlan.fire({ sessionId: plan.sessionId, planId })
    }
    this.outputChannel.debug(`[Plan] Removed comment ${commentId} from plan ${planId}`)
    return true
  }

  /** Get all comments for a plan */
  getPlanComments(planId: string): PlanComment[] {
    return this.planComments.get(planId) ?? []
  }

  /** Get a plan by ID */
  getPlan(planId: string): Plan | undefined {
    return this.plans.get(planId)
  }

  /** Get the current preview plan ID */
  getCurrentPreviewPlanId(): string | null {
    return this.currentPreviewPlanId
  }

  /** Get all plans for a session */
  getSessionPlans(sessionId: string): Plan[] {
    const result: Plan[] = []
    for (const [, plan] of this.plans) {
      if (plan.sessionId === sessionId) {
        result.push(plan)
      }
    }
    return result
  }

  /** Get the active (previewing) plan for a session */
  getActivePlan(sessionId: string): Plan | undefined {
    if (!this.currentPreviewPlanId) return undefined
    const plan = this.plans.get(this.currentPreviewPlanId)
    if (plan && plan.sessionId === sessionId) return plan
    return undefined
  }

  /** Clear plans for a session */
  clearSession(sessionId: string): void {
    for (const [id, plan] of this.plans) {
      if (plan.sessionId === sessionId) {
        this.plans.delete(id)
        this.planComments.delete(id)
      }
    }
  }

  dispose(): void {
    this.plans.clear()
    this.planComments.clear()
    this._onDidChangePlan.dispose()
    this._onDidClosePreview.dispose()
  }
}
