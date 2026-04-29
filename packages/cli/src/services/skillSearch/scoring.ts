import type { SkillSearchHit } from './types.js'

/** Stub scorer — returns hits unchanged. */
export function scoreSkillHits(hits: SkillSearchHit[]): SkillSearchHit[] {
  return hits
}
