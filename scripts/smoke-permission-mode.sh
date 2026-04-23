#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[smoke-permission-mode] expected output to contain: $needle" >&2
    exit 1
  fi
}

echo "[smoke-permission-mode] verifying dontAsk denial branch"
deny_output="$(
  python3 - <<'PY'
import os
import subprocess

target = '/tmp/cc-local-permission-smoke.txt'
try:
    os.unlink(target)
except FileNotFoundError:
    pass

cmd = [
    'bun',
    'run',
    'start',
    '--',
    '--print',
    'run bash command: touch /tmp/cc-local-permission-smoke.txt ; then answer only done',
    '--permission-mode',
    'dontAsk',
    '--output-format',
    'stream-json',
    '--verbose',
]

try:
    proc = subprocess.run(
        cmd,
        cwd='/Users/yanluohao/开发/cc-local',
        capture_output=True,
        text=True,
        timeout=35,
    )
    print(proc.stdout)
    print(proc.stderr)
except subprocess.TimeoutExpired as exc:
    stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or '')
    stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or '')
    print(stdout)
    print(stderr)

print(f'TARGET_EXISTS={os.path.exists(target)}')
PY
)"
assert_contains "$deny_output" "\"permissionMode\":\"dontAsk\""
assert_contains "$deny_output" "Permission to use Bash has been denied because Claude Code is running in don't ask mode"
assert_contains "$deny_output" "TARGET_EXISTS=False"

echo "[smoke-permission-mode] verifying acceptEdits auto-allow branch"
accept_output="$(
  python3 - <<'PY'
import shutil
import subprocess
import tempfile
from pathlib import Path

repo = Path(tempfile.mkdtemp(prefix='cc-local-perm-'))
cli = '/Users/yanluohao/开发/cc-local/dist/cli.js'

cmd = [
    'bun',
    cli,
    '--print',
    'create a file named note.txt in the current directory with exact content hi',
    '--permission-mode',
    'acceptEdits',
    '--output-format',
    'stream-json',
    '--verbose',
]

try:
    proc = subprocess.run(
        cmd,
        cwd=str(repo),
        capture_output=True,
        text=True,
        timeout=45,
    )
    print(proc.stdout)
    print(proc.stderr)
    note = repo / 'note.txt'
    print(f'NOTE_EXISTS={note.exists()}')
    if note.exists():
      print(f'NOTE_CONTENT={note.read_text()}')
finally:
    shutil.rmtree(repo, ignore_errors=True)
PY
)"
assert_contains "$accept_output" "\"permissionMode\":\"acceptEdits\""
assert_contains "$accept_output" "NOTE_EXISTS=True"
assert_contains "$accept_output" "NOTE_CONTENT=hi"

echo "[smoke-permission-mode] verifying bypassPermissions startup branch"
bypass_output="$(
  python3 - <<'PY'
import subprocess

cmd = [
    'bun',
    'run',
    'start',
    '--',
    '--print',
    'run bash command pwd and answer only done',
    '--permission-mode',
    'bypassPermissions',
    '--output-format',
    'stream-json',
    '--verbose',
]

try:
    proc = subprocess.run(
        cmd,
        cwd='/Users/yanluohao/开发/cc-local',
        capture_output=True,
        text=True,
        timeout=18,
    )
    print(proc.stdout)
    print(proc.stderr)
except subprocess.TimeoutExpired as exc:
    stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or '')
    stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or '')
    print(stdout)
    print(stderr)
PY
)"
assert_contains "$bypass_output" "\"permissionMode\":\"bypassPermissions\""
assert_contains "$bypass_output" "\"name\":\"Bash\""
assert_contains "$bypass_output" "\"tool_use_result\""

echo "[smoke-permission-mode] permission-mode checks passed"
