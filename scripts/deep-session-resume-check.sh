#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

latest_session_file() {
  python3 - <<'PY'
from pathlib import Path
root = Path.home()/'.claude/projects'/'-Users-yanluohao----cc-local'
files = sorted(root.glob('*.jsonl'), key=lambda p: p.stat().st_mtime)
print(files[-1].name if files else '')
PY
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[deep-check] expected output to contain: $needle" >&2
    exit 1
  fi
}

seed_json="$(bun run start -- --print "resume seed" --output-format json)"
assert_contains "$seed_json" "\"session_id\":"

resume_target="$(latest_session_file)"
if [[ -z "$resume_target" ]]; then
  echo "[deep-check] no session file found for resume target" >&2
  exit 1
fi

echo "[deep-check] --resume ${resume_target%.jsonl}"
resume_json="$(bun run start -- --resume "${resume_target%.jsonl}" --print "resume smoke" --output-format json)"
assert_contains "$resume_json" "\"session_id\":\"${resume_target%.jsonl}\""

echo "[deep-check] --continue"
continue_json="$(bun run start -- --continue --print "continue smoke" --output-format json)"
assert_contains "$continue_json" "\"type\":\"result\""
assert_contains "$continue_json" "\"session_id\":"

echo "[deep-check] session resume checks passed"
