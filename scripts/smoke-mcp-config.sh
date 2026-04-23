#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[smoke-mcp] expected output to contain: $needle" >&2
    exit 1
  fi
}

tmp_root="$(mktemp -d)"
test_home="$tmp_root/home"
test_proj="$tmp_root/project"
mkdir -p "$test_home/.claude" "$test_proj"

echo "[smoke-mcp] user scope add"
user_add_output="$(HOME="$test_home" bun run start -- mcp add --transport http -s user user_http http://127.0.0.1:9/mcp)"
assert_contains "$user_add_output" "Added HTTP MCP server user_http"
assert_contains "$user_add_output" "File modified:"
assert_contains "$(cat "$test_home/.claude.json")" "\"user_http\""

echo "[smoke-mcp] local scope add"
local_add_output="$(HOME="$test_home" bun run start -- mcp add --transport http -s local local_http http://127.0.0.1:9/mcp)"
assert_contains "$local_add_output" "Added HTTP MCP server local_http"
assert_contains "$(cat "$test_home/.claude.json")" "\"local_http\""

echo "[smoke-mcp] project scope add/list/get/remove"
project_add_output="$(cd "$test_proj" && HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp add --transport http -s project project_http http://127.0.0.1:9/mcp)"
assert_contains "$project_add_output" "Added HTTP MCP server project_http"
assert_contains "$(cat "$test_proj/.mcp.json")" "\"project_http\""

project_list_output="$(cd "$test_proj" && HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp list)"
assert_contains "$project_list_output" "Checking MCP server health..."
assert_contains "$project_list_output" "project_http: http://127.0.0.1:9/mcp (HTTP)"

project_get_output="$(cd "$test_proj" && HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp get project_http)"
assert_contains "$project_get_output" "Scope: Project config"
assert_contains "$project_get_output" "Status:"
assert_contains "$project_get_output" "URL: http://127.0.0.1:9/mcp"

project_remove_output="$(cd "$test_proj" && HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp remove -s project project_http)"
assert_contains "$project_remove_output" "Removed MCP server project_http from project config"
assert_contains "$(cat "$test_proj/.mcp.json")" "\"mcpServers\": {}"

echo "[smoke-mcp] MCP config smoke checks passed"
