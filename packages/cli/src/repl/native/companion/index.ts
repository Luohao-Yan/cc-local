/**
 * Companion and Special Features Index
 *
 * Exports companion sprites, task management, and search.
 */

// Companion sprites
export {
  createCompanionState,
  tickCompanion,
  setCompanionReaction,
  renderCompanion,
  renderCompanionInline,
} from './SpriteRenderer.js'
export type { CompanionState } from './SpriteRenderer.js'

// Task management
export { TaskManager, createTaskManager } from './TaskManager.js'
export type { TaskEntry, TaskStatus } from './TaskManager.js'

// Search and navigation
export { SearchManager, createSearchManager } from './SearchManager.js'
export type { SearchMatch, SearchState } from './SearchManager.js'
