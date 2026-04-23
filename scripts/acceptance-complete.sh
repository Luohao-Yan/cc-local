#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  echo "[acceptance] $*"
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[acceptance] expected output to contain: $needle" >&2
    exit 1
  fi
}

assert_not_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" == *"$needle"* ]]; then
    echo "[acceptance] expected output not to contain: $needle" >&2
    exit 1
  fi
}

assert_no_residual_processes() {
  local residual
  residual="$(ps -axo command | grep -E 'packages/server/src/index.ts|dist/server.js|cli.js models list|cclocal-dist-smoke' | grep -v grep || true)"
  if [[ -n "$residual" ]]; then
    echo "[acceptance] residual cclocal processes found:" >&2
    echo "$residual" >&2
    exit 1
  fi
}

log "typecheck packages/cli"
bun run --cwd packages/cli typecheck

log "run package tests"
bun run test

log "build full distribution"
bun run build:all

log "run parity audit"
bun run parity:check

log "verify default help keeps legacy Claude UI"
start_help="$(bun run start -- --help)"
assert_contains "$start_help" "Usage: claude"
assert_contains "$start_help" "Claude Code - starts an interactive session by default"
assert_contains "$start_help" "mcp"
assert_contains "$start_help" "--worktree"
assert_not_contains "$start_help" "CCLocal Interactive Mode"

dist_help="$(bun dist/cli.js --help)"
assert_contains "$dist_help" "Usage: claude"
assert_contains "$dist_help" "Claude Code - starts an interactive session by default"
assert_contains "$dist_help" "setup-token"
assert_contains "$dist_help" "update"
assert_not_contains "$dist_help" "CCLocal Interactive Mode"

log "verify packages management subcommands remain available"
packages_help="$(bun dist/cli.js models --help)"
assert_contains "$packages_help" "Usage: cclocal models"
assert_contains "$packages_help" "List models available from the local server API"

log "verify local commands do not auto-start embedded server"
auth_status="$(bun dist/cli.js auth status)"
assert_contains "$auth_status" "Auth:"
assert_not_contains "$auth_status" "Starting embedded server"

model_current="$(bun dist/cli.js model current)"
assert_contains "$model_current" "Current model:"
assert_not_contains "$model_current" "Starting embedded server"

log "verify REST commands auto-start and exit cleanly"
models_output="$(bun dist/cli.js models list)"
assert_contains "$models_output" "claude-sonnet-4"
assert_contains "$models_output" "doubao"
assert_contains "$models_output" "Starting embedded server"
assert_no_residual_processes

log "verify embedded server avoids port 5678 conflicts"
port_log="$(mktemp /tmp/cclocal-port-5678-XXXXXX.log)"
bun -e 'const server = Bun.serve({ hostname: "127.0.0.1", port: 5678, fetch() { return new Response("occupied") } }); console.log(`dummy:${server.port}`); setInterval(() => {}, 1000)' >"$port_log" 2>&1 &
port_pid=$!
sleep 0.5
if kill -0 "$port_pid" 2>/dev/null; then
  conflict_output="$(bun dist/cli.js models list)"
  kill "$port_pid" 2>/dev/null || true
  wait "$port_pid" 2>/dev/null || true
  assert_contains "$conflict_output" "claude-sonnet-4"
  assert_contains "$conflict_output" "doubao"
else
  log "port 5678 was already occupied; conflict path implicitly covered"
fi
rm -f "$port_log"
assert_no_residual_processes

log "verify dist package works outside repository layout"
tmpdir="$(mktemp -d /tmp/cclocal-dist-smoke-XXXXXX)"
cp dist/cli.js dist/server.js dist/legacy-cli.js dist/package.json "$tmpdir"/
dist_output="$(cd "$tmpdir" && bun cli.js models list)"
dist_default_help="$(cd "$tmpdir" && bun cli.js --help)"
rm -rf "$tmpdir"
assert_contains "$dist_output" "claude-sonnet-4"
assert_contains "$dist_output" "doubao"
assert_contains "$dist_default_help" "Usage: claude"
assert_no_residual_processes

log "complete acceptance passed"
