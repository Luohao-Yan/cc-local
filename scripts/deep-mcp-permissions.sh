#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[deep-mcp-permissions] expected output to contain: $needle" >&2
    exit 1
  fi
}

echo "[deep-mcp-permissions] Bash/Edit/Write via stdio mcp serve"
output="$(bun "$ROOT_DIR/scripts/check-mcp-permissions.mjs")"
assert_contains "$output" "\"readPreview\""
assert_contains "$output" "\"bashPreview\""
assert_contains "$output" "\"editPreview\""
assert_contains "$output" "\"writePreview\""
assert_contains "$output" "\"finalFile\": \"rewritten\\n\""

echo "[deep-mcp-permissions] MCP high-risk tool checks passed"
