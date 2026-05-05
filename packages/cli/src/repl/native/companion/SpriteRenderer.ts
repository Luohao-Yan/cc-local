/**
 * Companion/Sprite Renderer for Native REPL
 *
 * Renders ASCII art companions with animations and reactions.
 * Based on the Buddy system from the Ink UI.
 */

import chalk from 'chalk'
import type { Species, Eye, Hat, Rarity } from '../../../buddy/types.js'

/**
 * Simplified sprite frames for terminal rendering
 * Each sprite is 5 lines, padded to consistent width
 */
const SPRITE_FRAMES: Partial<Record<Species, string[][]>> = {
  duck: [
    [
      '            ',
      '    __      ',
      '  <(o )___  ',
      '   (  ._>   ',
      '    `--´    ',
    ],
    [
      '            ',
      '    __      ',
      '  <(o )___  ',
      '   (  ._>   ',
      '    `--´~   ',
    ],
  ],
  cat: [
    [
      '    /\\_/\\   ',
      '   ( o.o )  ',
      '    > ^ <   ',
      '   /|   |\\  ',
      '  (_|   |_) ',
    ],
    [
      '    /\\_/\\   ',
      '   ( -.- )  ',
      '    > ^ <   ',
      '   /|   |\\  ',
      '  (_|   |_) ',
    ],
  ],
  ghost: [
    [
      '     .--.   ',
      '    (o o)   ',
      '    | O |   ',
      '    |   |   ',
      '    `~~~´   ',
    ],
    [
      '     .-.-   ',
      '    (o o)   ',
      '    | O |   ',
      '    |   |   ',
      '    `~~~´   ',
    ],
  ],
  robot: [
    [
      '    [o_o]   ',
      '   /|___|\\  ',
      '    |   |   ',
      '   _|   |_  ',
      '  (___)___) ',
    ],
    [
      '    [-_-]   ',
      '   /|___|\\  ',
      '    |   |   ',
      '   _|   |_  ',
      '  (___)___) ',
    ],
  ],
  penguin: [
    [
      '    (o_o)   ',
      '   /(   )\\  ',
      '   \\|   |/  ',
      '    |   |   ',
      '   (_) (_)  ',
    ],
    [
      '    (o_o)   ',
      '   /(   )\\  ',
      '   \\|   |/  ',
      '    |   |   ',
      '   (v) (v)  ',
    ],
  ],
  octopus: [
    [
      '    _||_    ',
      '   (o  o)   ',
      '  /|    |\\  ',
      ' / |    | \\ ',
      '~~~^^^^^~~~ ',
    ],
    [
      '    _||_    ',
      '   (o  o)   ',
      '  /|    |\\  ',
      ' / |    | \\ ',
      '~~^^^^^^^~~ ',
    ],
  ],
}

/**
 * Hat overlays (line 0 of sprite)
 */
const HAT_SPRITES: Record<Hat, string> = {
  none: '            ',
  crown: '    ♔       ',
  tophat: '    ╤╤      ',
  propeller: '    ⊛       ',
  halo: '    ○       ',
  wizard: '    △       ',
  beanie: '    ∩∩      ',
  tinyduck: '   <(o)>    ',
}

/**
 * Reaction emojis shown in speech bubbles
 */
const REACTIONS: Record<string, string[]> = {
  thinking: ['🤔', '💭', '👀'],
  success: ['🎉', '✨', '💪', '⭐'],
  error: ['😰', '💥', '❌'],
  waiting: ['⏳', '😴', '🍵'],
  coding: ['⌨️', '🔧', '💻'],
  reading: ['📖', '🔍', '📝'],
  celebrating: ['🎊', '🥳', '🏆'],
}

/**
 * Rarity display config
 */
const RARITY_DISPLAY: Record<Rarity, { stars: string; color: (s: string) => string }> = {
  common: { stars: '★', color: chalk.dim },
  uncommon: { stars: '★★', color: chalk.green },
  rare: { stars: '★★★', color: chalk.blue },
  epic: { stars: '★★★★', color: chalk.magenta },
  legendary: { stars: '★★★★★', color: chalk.yellow },
}

/**
 * Companion state for animation
 */
export interface CompanionState {
  /** Companion species */
  species: Species
  /** Eye style */
  eye: Eye
  /** Hat */
  hat: Hat
  /** Rarity */
  rarity: Rarity
  /** Companion name */
  name: string
  /** Current animation frame */
  frame: number
  /** Current reaction */
  reaction: string | null
  /** Animation tick counter */
  tick: number
}

/**
 * Create initial companion state
 */
export function createCompanionState(
  species: Species = 'duck',
  rarity: Rarity = 'common',
  name: string = 'Buddy',
): CompanionState {
  return {
    species,
    eye: '·',
    hat: 'none',
    rarity,
    name,
    frame: 0,
    reaction: null,
    tick: 0,
  }
}

/**
 * Advance companion animation
 */
export function tickCompanion(state: CompanionState): CompanionState {
  const frames = SPRITE_FRAMES[state.species] ?? SPRITE_FRAMES.duck!
  const newFrame = (state.frame + 1) % frames.length
  const newTick = state.tick + 1

  // Clear reaction after 10 ticks
  const newReaction = newTick > 10 ? null : state.reaction

  return {
    ...state,
    frame: newFrame,
    tick: newReaction !== state.reaction ? 0 : newTick,
  }
}

/**
 * Set a reaction on the companion
 */
export function setCompanionReaction(
  state: CompanionState,
  reactionType: string,
): CompanionState {
  return {
    ...state,
    reaction: reactionType,
    tick: 0,
  }
}

/**
 * Render the companion sprite
 */
export function renderCompanion(state: CompanionState): string {
  const frames = SPRITE_FRAMES[state.species] ?? SPRITE_FRAMES.duck!
  const frame = frames[state.frame % frames.length] ?? frames[0]!
  const rarityConfig = RARITY_DISPLAY[state.rarity]

  const lines: string[] = []

  // Hat line
  const hatLine = HAT_SPRITES[state.hat] ?? HAT_SPRITES.none
  lines.push(`  ${rarityConfig.color(hatLine)}`)

  // Body lines with eye substitution
  for (const line of frame) {
    const rendered = line.replace(/o/g, state.eye)
    lines.push(`  ${rarityConfig.color(rendered)}`)
  }

  // Name and rarity
  lines.push(`  ${chalk.bold(state.name)} ${rarityConfig.color(rarityConfig.stars)}`)

  // Reaction bubble
  if (state.reaction && state.reaction in REACTIONS) {
    const emojis = REACTIONS[state.reaction]!
    const emoji = emojis[state.tick % emojis.length]!
    lines.push(`  ${chalk.dim('╭─')}`)
    lines.push(`  ${chalk.dim('│')} ${emoji}`)
    lines.push(`  ${chalk.dim('╰─')}`)
  }

  return lines.join('\n')
}

/**
 * Render companion in compact inline form (single line)
 */
export function renderCompanionInline(state: CompanionState): string {
  const rarityConfig = RARITY_DISPLAY[state.rarity]
  const frames = SPRITE_FRAMES[state.species] ?? SPRITE_FRAMES.duck!
  const frame = frames[state.frame % frames.length] ?? frames[0]!

  // Just show the middle line of the sprite
  const bodyLine = frame[2]?.replace(/o/g, state.eye) ?? '  <(o )___  '
  return rarityConfig.color(bodyLine.trim())
}