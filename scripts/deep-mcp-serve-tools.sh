#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[deep-mcp-serve-tools] expected output to contain: $needle" >&2
    exit 1
  fi
}

echo "[deep-mcp-serve-tools] list_tools + call_tool via stdio mcp serve"
output="$(bun "$ROOT_DIR/scripts/check-mcp-serve-tools.mjs")"
assert_contains "$output" "\"toolCount\""
assert_contains "$output" "\"Read\""
assert_contains "$output" "\"Bash\""
assert_contains "$output" "alpha"

echo "[deep-mcp-serve-tools] mcp serve tool exposure checks passed"
