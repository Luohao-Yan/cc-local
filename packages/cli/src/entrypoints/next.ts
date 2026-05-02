/**
 * cclocal-next — Grayscale candidate entry
 *
 * Routes interactive sessions through the legacy Ink/React UI bridge,
 * giving users the exact same terminal experience as `cclocal`.
 * The data source is the new QueryEngine (not the legacy query.ts),
 * so the old UI renders output from the new architecture.
 *
 * Single-shot `--print` mode uses QueryEngine directly (no UI needed).
 *
 * Set CCLOCAL_DEFAULT_NATIVE=0 or pass --legacy to fall back to the
 * out-of-process legacy spawnSync path.
 *
 * When the bridge + QueryEngine integration passes full acceptance,
 * this entry becomes the default `cclocal` binary and this file can
 * be retired.
 */

// 1. Tell shouldUseLegacyUi() NOT to spawnSync the old entry — we
//    load the UI in-process via the bridge instead.
process.env.CCLOCAL_DEFAULT_NATIVE = '1'

// 2. Tell the action handler in index.ts to prefer the in-process
//    legacy bridge for interactive REPL (instead of nativeRepl.ts).
process.env.CCLOCAL_PREFER_LEGACY_BRIDGE = '1'

// 3. Tell REPL.tsx to use the QueryEngine adapter instead of the
//    legacy query.ts. This is the key switch for Phase 7.2: the old
//    UI now consumes data from the new architecture.
process.env.CCLOCAL_USE_QUERY_ENGINE = '1'

// Re-run the unified router — it will now skip the out-of-process
// legacy delegation and route interactive sessions to the bridge.
import '../index.ts'
