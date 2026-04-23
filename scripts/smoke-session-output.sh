#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PROJECT_SESSIONS_DIR="$HOME/.claude/projects/-Users-yanluohao----cc-local"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[smoke] expected output to contain: $needle" >&2
    exit 1
  fi
}

assert_not_empty() {
  local value="$1"
  if [[ -z "${value//[$'\t\r\n ']}" ]]; then
    echo "[smoke] expected non-empty output" >&2
    exit 1
  fi
}

latest_session_file() {
  python3 - <<'PY'
from pathlib import Path
root = Path.home()/'.claude/projects'/'-Users-yanluohao----cc-local'
files = sorted(root.glob('*.jsonl'), key=lambda p: p.stat().st_mtime)
print(files[-1].name if files else '')
PY
}

echo "[smoke] --print text"
print_text="$(bun run start -- --print "hello smoke")"
assert_not_empty "$print_text"

echo "[smoke] --print json"
print_json="$(bun run start -- --print "json smoke" --output-format json)"
assert_contains "$print_json" "\"type\":\"result\""
assert_contains "$print_json" "\"session_id\":"

echo "[smoke] --print stream-json"
stream_json="$(printf '{"type":"user","message":{"role":"user","content":"hello stream smoke"}}\n' | bun run start -- --print --verbose --input-format stream-json --output-format stream-json)"
assert_contains "$stream_json" "\"type\":\"system\""
assert_contains "$stream_json" "\"type\":\"result\""

echo "[smoke] --no-session-persistence"
no_persist_json="$(bun run start -- --print "no persist smoke" --no-session-persistence --output-format json)"
assert_contains "$no_persist_json" "\"session_id\":"
no_persist_session_id="$(printf '%s' "$no_persist_json" | python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["session_id"])')"
if [[ -f "$PROJECT_SESSIONS_DIR/${no_persist_session_id}.jsonl" ]]; then
  echo "[smoke] expected no-persistence session file to be absent: ${no_persist_session_id}.jsonl" >&2
  exit 1
fi

echo "[smoke] session/output smoke checks passed"
