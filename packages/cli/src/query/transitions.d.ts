/**
 * Type declarations for the query transitions module.
 * Internal Anthropic query state machine transitions.
 */
export type Terminal = { type: 'terminal' }
export type Continue = { type: 'continue' }
