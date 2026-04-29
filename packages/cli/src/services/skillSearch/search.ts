import type { SkillSearchHit, SkillSearchQuery } from './types.js'
import { scoreSkillHits } from './scoring.js'

/** Stub search — always empty. */
export async function searchSkills(
  _query: SkillSearchQuery,
): Promise<SkillSearchHit[]> {
  return scoreSkillHits([])
}
