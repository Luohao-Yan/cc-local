#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[deep-mcp-runtime] expected output to contain: $needle" >&2
    exit 1
  fi
}

get_free_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
}

tmp_root="$(mktemp -d)"
test_home="$tmp_root/home"
test_proj="$tmp_root/project"
mkdir -p "$test_home/.claude" "$test_proj"

http_pid=""
sse_pid=""

cleanup() {
  if [[ -n "$http_pid" ]]; then
    kill "$http_pid" >/dev/null 2>&1 || true
    wait "$http_pid" 2>/dev/null || true
  fi
  if [[ -n "$sse_pid" ]]; then
    kill "$sse_pid" >/dev/null 2>&1 || true
    wait "$sse_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT

echo "[deep-mcp-runtime] stdio via official mcp serve"
stdio_get_output="$(
  cd "$test_proj"
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp add -s project official_stdio -- bun "$ROOT_DIR/dist/cli.js" mcp serve >/dev/null
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp get official_stdio
)"
assert_contains "$stdio_get_output" "Status: ✓ Connected"
assert_contains "$stdio_get_output" "Type: stdio"
assert_contains "$stdio_get_output" "Command: bun"

echo "[deep-mcp-runtime] streamable HTTP transport"
http_port="$(get_free_port)"
http_log="$tmp_root/http.log"
bun "$ROOT_DIR/scripts/test-mcp-http-server.mjs" --port "$http_port" >"$http_log" 2>&1 &
http_pid=$!
sleep 1
http_get_output="$(
  cd "$test_proj"
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp add --transport http -s project runtime_http "http://127.0.0.1:$http_port/mcp" >/dev/null
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp get runtime_http
)"
assert_contains "$http_get_output" "Status: ✓ Connected"
assert_contains "$http_get_output" "Type: http"
assert_contains "$http_get_output" "URL: http://127.0.0.1:$http_port/mcp"

echo "[deep-mcp-runtime] SSE transport"
sse_port="$(get_free_port)"
sse_log="$tmp_root/sse.log"
bun "$ROOT_DIR/scripts/test-mcp-sse-server.mjs" --port "$sse_port" >"$sse_log" 2>&1 &
sse_pid=$!
sleep 1
sse_get_output="$(
  cd "$test_proj"
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp add --transport sse -s project runtime_sse "http://127.0.0.1:$sse_port/mcp" >/dev/null
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp get runtime_sse
)"
assert_contains "$sse_get_output" "Status: ✓ Connected"
assert_contains "$sse_get_output" "Type: sse"
assert_contains "$sse_get_output" "URL: http://127.0.0.1:$sse_port/mcp"

echo "[deep-mcp-runtime] precedence local > project > user"
precedence_get_output="$(
  cd "$test_proj"
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp add --transport http -s user shadowed "http://127.0.0.1:$http_port/mcp" >/dev/null
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp add --transport sse -s project shadowed "http://127.0.0.1:$sse_port/mcp" >/dev/null
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp add -s local shadowed -- bun "$ROOT_DIR/dist/cli.js" mcp serve >/dev/null
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp get shadowed
)"
assert_contains "$precedence_get_output" "Scope: Local config (private to you in this project)"
assert_contains "$precedence_get_output" "Status: ✓ Connected"
assert_contains "$precedence_get_output" "Type: stdio"
assert_contains "$precedence_get_output" "Command: bun"

echo "[deep-mcp-runtime] list sees active runtime transports"
list_output="$(
  cd "$test_proj"
  HOME="$test_home" bun "$ROOT_DIR/dist/cli.js" mcp list
)"
assert_contains "$list_output" "official_stdio: bun $ROOT_DIR/dist/cli.js mcp serve - ✓ Connected"
assert_contains "$list_output" "runtime_http: http://127.0.0.1:$http_port/mcp (HTTP) - ✓ Connected"
assert_contains "$list_output" "runtime_sse: http://127.0.0.1:$sse_port/mcp (SSE) - ✓ Connected"

echo "[deep-mcp-runtime] MCP runtime checks passed"
