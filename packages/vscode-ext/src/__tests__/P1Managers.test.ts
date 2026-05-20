/**
 * Tests for P1 Manager modules
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CommentManager } from '../comments/CommentManager.js'
import { ReviewManager } from '../review/ReviewManager.js'
import { PlanManager } from '../plan/PlanManager.js'
import { ProactiveSuggestionsManager } from '../proactive/ProactiveSuggestionsManager.js'
import { BrowserTabManager } from '../browser/BrowserTabManager.js'

// ─── CommentManager ─────────────────────────────────────────────────────────

describe('CommentManager', () => {
  let cm: CommentManager

  beforeEach(() => {
    cm = new CommentManager({
      info(msg: string) {},
      debug(msg: string) {},
      error(msg: string) {},
      warn(msg: string) {},
    } as any)
  })

  it('should add a comment', () => {
    const comment = cm.addComment('sess1', 'res1', 'Hello world')
    expect(comment.id).toBeTruthy()
    expect(comment.text).toBe('Hello world')
    expect(comment.resourceId).toBe('res1')
  })

  it('should get comments for a resource', () => {
    cm.addComment('sess1', 'res1', 'Comment 1')
    cm.addComment('sess1', 'res1', 'Comment 2')
    cm.addComment('sess1', 'res2', 'Comment 3')
    const comments = cm.getComments('sess1', 'res1')
    expect(comments).toHaveLength(2)
  })

  it('should remove a comment by ID', () => {
    const comment = cm.addComment('sess1', 'res1', 'To remove')
    const removed = cm.removeComment('sess1', 'res1', comment.id)
    expect(removed).toBe(true)
    expect(cm.getComments('sess1', 'res1')).toHaveLength(0)
  })

  it('should return false when removing non-existent comment', () => {
    expect(cm.removeComment('sess1', 'res1', 'non-existent-id')).toBe(false)
  })

  it('should count comments', () => {
    cm.addComment('sess1', 'res1', 'One')
    cm.addComment('sess1', 'res1', 'Two')
    expect(cm.getCommentCount('sess1', 'res1')).toBe(2)
  })

  it('should clear session comments', () => {
    cm.addComment('sess1', 'res1', 'One')
    cm.addComment('sess1', 'res2', 'Two')
    cm.clearSession('sess1')
    expect(cm.getComments('sess1', 'res1')).toHaveLength(0)
    expect(cm.getComments('sess1', 'res2')).toHaveLength(0)
  })

  it('should support comments with line ranges', () => {
    const comment = cm.addComment('sess1', 'res1', 'On lines', { startLine: 5, endLine: 10 })
    expect(comment.range).toEqual({ startLine: 5, endLine: 10 })
  })

  it('should report comments enabled', () => {
    expect(cm.isCommentsEnabled()).toBe(true)
  })
})

// ─── ReviewManager ──────────────────────────────────────────────────────────

describe('ReviewManager', () => {
  let rm: ReviewManager

  beforeEach(() => {
    rm = new ReviewManager({
      info(msg: string) {},
      debug(msg: string) {},
      error(msg: string) {},
      warn(msg: string) {},
    } as any)
  })

  it('should create a review request', () => {
    const req = rm.createReviewRequest('sess1', ['/src/a.ts', '/src/b.ts'], 'full')
    expect(req.id).toBeTruthy()
    expect(req.filePaths).toHaveLength(2)
    expect(req.type).toBe('full')
    expect(req.status).toBe('pending')
  })

  it('should update review status', () => {
    const req = rm.createReviewRequest('sess1', ['/src/a.ts'], 'quick')
    const updated = rm.updateReviewStatus(req.id, 'in_progress')
    expect(updated).toBe(true)
    const active = rm.getActiveReview('sess1')
    expect(active?.id).toBe(req.id)
  })

  it('should store a review response', () => {
    const req = rm.createReviewRequest('sess1', ['/src/a.ts'], 'diff')
    const response = {
      requestId: req.id,
      summary: 'Looks good',
      findings: [],
      action: 'approve' as const,
    }
    rm.storeReviewResponse(response)
    const stored = rm.getReviewResponse(req.id)
    expect(stored?.summary).toBe('Looks good')
  })

  it('should cancel pending reviews for a session', () => {
    rm.createReviewRequest('sess1', ['/a.ts'], 'full')
    rm.createReviewRequest('sess1', ['/b.ts'], 'quick')
    rm.cancelSessionReviews('sess1')
    const reviews = rm.getSessionReviews('sess1')
    expect(reviews.every(r => r.status === 'cancelled')).toBe(true)
  })

  it('should show review upsell banner when not dismissed', () => {
    expect(rm.shouldShowReviewUpsell()).toBe(true)
  })
})

// ─── PlanManager ──────────────────────────────────────────────────────────

describe('PlanManager', () => {
  let pm: PlanManager

  beforeEach(() => {
    pm = new PlanManager({
      info(msg: string) {},
      debug(msg: string) {},
      error(msg: string) {},
      warn(msg: string) {},
    } as any)
  })

  it('should create a plan', () => {
    const plan = pm.createPlan('sess1', '# Plan\nStep 1: Do things', 'My Plan')
    expect(plan.id).toBeTruthy()
    expect(plan.content).toContain('Step 1')
    expect(plan.status).toBe('draft')
  })

  it('should show plan preview', () => {
    const plan = pm.createPlan('sess1', 'Content', 'Title')
    const shown = pm.showPreview(plan.id)
    expect(shown).toBe(true)
    expect(pm.getCurrentPreviewPlanId()).toBe(plan.id)
  })

  it('should close plan preview', () => {
    const plan = pm.createPlan('sess1', 'Content', 'Title')
    pm.showPreview(plan.id)
    pm.closePreview(plan.id)
    expect(pm.getCurrentPreviewPlanId()).toBeNull()
  })

  it('should accept a plan', () => {
    const plan = pm.createPlan('sess1', 'Content', 'Title')
    pm.acceptPlan(plan.id)
    expect(pm.getPlan(plan.id)?.status).toBe('accepted')
  })

  it('should reject a plan', () => {
    const plan = pm.createPlan('sess1', 'Content', 'Title')
    pm.rejectPlan(plan.id)
    expect(pm.getPlan(plan.id)?.status).toBe('rejected')
  })

  it('should add and retrieve plan comments', () => {
    const plan = pm.createPlan('sess1', 'Content', 'Title')
    const comment = pm.addPlanComment(plan.id, 'Looks great')
    expect(comment).toBeTruthy()
    expect(comment!.text).toBe('Looks great')
    const comments = pm.getPlanComments(plan.id)
    expect(comments).toHaveLength(1)
  })

  it('should remove plan comments', () => {
    const plan = pm.createPlan('sess1', 'Content', 'Title')
    const comment = pm.addPlanComment(plan.id, 'Remove me')
    pm.removePlanComment(plan.id, comment!.id)
    expect(pm.getPlanComments(plan.id)).toHaveLength(0)
  })

  it('should clear session plans', () => {
    pm.createPlan('sess1', 'Plan A', 'A')
    pm.createPlan('sess1', 'Plan B', 'B')
    pm.clearSession('sess1')
    expect(pm.getSessionPlans('sess1')).toHaveLength(0)
  })
})

// ─── ProactiveSuggestionsManager ───────────────────────────────────────────

describe('ProactiveSuggestionsManager', () => {
  let psm: ProactiveSuggestionsManager

  beforeEach(() => {
    psm = new ProactiveSuggestionsManager({
      info(msg: string) {},
      debug(msg: string) {},
      error(msg: string) {},
      warn(msg: string) {},
    } as any)
  })

  it('should be disabled by default', () => {
    expect(psm.enabled).toBe(false)
  })

  it('should enable and disable', () => {
    psm.setEnabled(true)
    expect(psm.enabled).toBe(true)
    psm.setEnabled(false)
    expect(psm.enabled).toBe(false)
  })

  it('should update suggestions when enabled', () => {
    psm.setEnabled(true)
    psm.updateSuggestions([{ type: 'refactor', message: 'Extract method' }])
    expect(psm.getSuggestions()).toHaveLength(1)
  })

  it('should not update suggestions when disabled', () => {
    psm.updateSuggestions([{ type: 'fix', message: 'Fix bug' }])
    expect(psm.getSuggestions()).toHaveLength(0)
  })

  it('should dismiss a suggestion', () => {
    psm.setEnabled(true)
    psm.updateSuggestions([{ type: 'refactor', message: 'Refactor 1' }, { type: 'fix', message: 'Fix 1' }])
    const suggestions = psm.getSuggestions()
    psm.dismissSuggestion(suggestions[0].id)
    expect(psm.getSuggestions()).toHaveLength(1)
  })

  it('should clear all suggestions', () => {
    psm.setEnabled(true)
    psm.updateSuggestions([{ type: 'refactor', message: 'A' }])
    psm.clearSuggestions()
    expect(psm.getSuggestions()).toHaveLength(0)
  })
})

// ─── BrowserTabManager ────────────────────────────────────────────────────

describe('BrowserTabManager', () => {
  let btm: BrowserTabManager

  beforeEach(() => {
    btm = new BrowserTabManager({
      info(msg: string) {},
      debug(msg: string) {},
      error(msg: string) {},
      warn(msg: string) {},
    } as any)
  })

  it('should create a tab', () => {
    const tab = btm.createTab('https://example.com')
    expect(tab.id).toBeTruthy()
    expect(tab.url).toBe('https://example.com')
    expect(tab.isActive).toBe(true)
  })

  it('should deactivate previous tab on new tab creation', () => {
    btm.createTab('https://a.com')
    const tab2 = btm.createTab('https://b.com')
    const tabs = btm.getTabs()
    expect(tabs[0].isActive).toBe(false)
    expect(tabs[1].isActive).toBe(true)
  })

  it('should switch tabs', () => {
    btm.createTab('https://a.com')
    btm.createTab('https://b.com')
    const switched = btm.switchTab(btm.getTabs()[0].id)
    expect(switched).toBe(true)
    expect(btm.getTabs()[0].isActive).toBe(true)
    expect(btm.getTabs()[1].isActive).toBe(false)
  })

  it('should close a tab and activate another', () => {
    btm.createTab('https://a.com')
    btm.createTab('https://b.com')
    btm.closeTab(btm.getTabs()[1].id)
    expect(btm.getTabs()).toHaveLength(1)
    expect(btm.getTabs()[0].isActive).toBe(true)
  })

  it('should get active tab', () => {
    btm.createTab('https://a.com')
    btm.createTab('https://b.com')
    const active = btm.getActiveTab()
    expect(active?.url).toBe('https://b.com')
  })

  it('should provide tabs context for MCP', () => {
    btm.createTab('https://a.com')
    const context = btm.getTabsContext()
    expect(context).toHaveLength(1)
    expect(context[0].url).toBe('https://a.com')
  })

  it('should update a tab', () => {
    const tab = btm.createTab('about:blank')
    btm.updateTab(tab.id, { url: 'https://updated.com', title: 'Updated' })
    expect(btm.getTabs()[0].url).toBe('https://updated.com')
    expect(btm.getTabs()[0].title).toBe('Updated')
  })
})
