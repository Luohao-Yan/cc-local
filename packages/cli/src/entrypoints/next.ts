/**
 * cclocal-next — Grayscale candidate entry
 *
 * Routes interactive sessions through the Ink/React UI bridge,
 * giving users the exact same terminal experience as `cclocal`.
 * The data source is the new QueryEngine (not the old query.ts),
 * so the Ink UI renders output from the new architecture.
 *
 * Single-shot `--print` mode uses QueryEngine directly (no UI needed).
 *
 * Set CCLOCAL_DEFAULT_NATIVE=0 or pass --ink to fall back to the
 * out-of-process Ink UI spawnSync path.
 *
 * When the bridge + QueryEngine integration passes full acceptance,
 * this entry becomes the default `cclocal` binary and this file can
 * be retired.
 */

// 1. Tell shouldUseInkUi() NOT to spawnSync the old entry — we
//    load the UI in-process via the bridge instead.
process.env.CCLOCAL_DEFAULT_NATIVE = '1'

// 2. Tell the action handler in index.ts to prefer the in-process
//    Ink bridge for interactive REPL (instead of nativeRepl.ts).
process.env.CCLOCAL_PREFER_INK_BRIDGE = '1'
process.env.CCLOCAL_PREFER_LEGACY_BRIDGE = '1' // backward compatibility

// 3. Tell REPL.tsx to use the QueryEngine adapter instead of the
//    old query.ts. This is the key switch: the Ink UI now consumes
//    data from the new architecture.
process.env.CCLOCAL_USE_QUERY_ENGINE = '1'

// Re-run the unified router — it will now skip the out-of-process
// Ink UI delegation and route interactive sessions to the bridge.
import '../index.ts'
