#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[deep-mcp] expected output to contain: $needle" >&2
    exit 1
  fi
}

tmp_root="$(mktemp -d)"
test_home="$tmp_root/home"
test_proj="$tmp_root/project"
mkdir -p "$test_home/.claude" "$test_proj"

echo "[deep-mcp] add-json with headers/oauth"
json='{"type":"http","url":"http://127.0.0.1:9/mcp","headers":{"Authorization":"Bearer test-token","X-Test":"yes"},"oauth":{"clientId":"client-123","callbackPort":8787}}'
add_json_output="$(HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp add-json -s user json_http "$json")"
assert_contains "$add_json_output" "Added http MCP server json_http to user config"
claude_config="$(cat "$test_home/.claude.json")"
assert_contains "$claude_config" "\"json_http\""
assert_contains "$claude_config" "\"Authorization\": \"Bearer test-token\""
assert_contains "$claude_config" "\"clientId\": \"client-123\""
assert_contains "$claude_config" "\"callbackPort\": 8787"

echo "[deep-mcp] remove ambiguity across scopes"
HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp add-json -s user dup_server '{"type":"http","url":"http://127.0.0.1:9/mcp"}' >/dev/null
project_add_output="$(cd "$test_proj" && HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp add --transport http -s project dup_server http://127.0.0.1:9/mcp)"
assert_contains "$project_add_output" "Added HTTP MCP server dup_server"
set +e
remove_output="$(cd "$test_proj" && HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp remove dup_server 2>&1)"
remove_status=$?
set -e
if [[ $remove_status -eq 0 ]]; then
  echo "[deep-mcp] expected ambiguous remove to fail" >&2
  exit 1
fi
assert_contains "$remove_output" "exists in multiple scopes"
assert_contains "$remove_output" "claude mcp remove \"dup_server\" -s project"
assert_contains "$remove_output" "claude mcp remove \"dup_server\" -s user"

echo "[deep-mcp] reset-project-choices"
real_test_proj="$(cd "$test_proj" && pwd -P)"
cat > "$test_home/.claude.json" <<JSON
{
  "projects": {
    "$real_test_proj": {
      "enabledMcpjsonServers": ["a", "b"],
      "disabledMcpjsonServers": ["c"],
      "enableAllProjectMcpServers": true
    }
  }
}
JSON
reset_output="$(cd "$test_proj" && HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp reset-project-choices)"
assert_contains "$reset_output" "All project-scoped (.mcp.json) server approvals and rejections have been reset."
post_reset="$(cat "$test_home/.claude.json")"
assert_contains "$post_reset" "\"enabledMcpjsonServers\": []"
assert_contains "$post_reset" "\"disabledMcpjsonServers\": []"
assert_contains "$post_reset" "\"enableAllProjectMcpServers\": false"

echo "[deep-mcp] Advanced MCP config checks passed"
