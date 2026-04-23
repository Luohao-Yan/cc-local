#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[smoke-session-advanced] fork-session + stream-json flags"
python3 - <<'PY'
import json
import subprocess

root = '/Users/yanluohao/开发/cc-local'

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

p1 = subprocess.run(
    ['bun', 'run', 'start', '--', '--print', 'say ok', '--output-format', 'json'],
    cwd=root,
    capture_output=True,
    text=True,
    timeout=120,
)
ensure(p1.returncode == 0, 'base session command failed')
base = json.loads(p1.stdout)
sid = base['session_id']

p2 = subprocess.run(
    ['bun', 'run', 'start', '--', '--resume', sid, '--fork-session', '--print', 'say ok again', '--output-format', 'json'],
    cwd=root,
    capture_output=True,
    text=True,
    timeout=120,
)
ensure(p2.returncode == 0, 'fork-session command failed')
child = json.loads(p2.stdout)
ensure(child['session_id'] != sid, 'fork-session did not create a new session id')

input_data = '{"type":"user","message":{"role":"user","content":"hello replay smoke"}}\n'
try:
    subprocess.run(
        ['bun', 'run', 'start', '--', '--print', '--verbose', '--input-format', 'stream-json', '--output-format', 'stream-json', '--replay-user-messages', '--include-partial-messages'],
        cwd=root,
        input=input_data,
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    out = ''
except subprocess.TimeoutExpired as e:
    out = e.stdout.decode() if isinstance(e.stdout, bytes) else (e.stdout or '')

ensure('"type":"system"' in out and '"subtype":"init"' in out, 'stream-json init event missing')
ensure('"type":"user"' in out and '"isReplay":true' in out, 'replay-user-messages output missing')
ensure('content_block_delta' in out or 'text_delta' in out or 'input_json_delta' in out, 'partial message output missing')

print('fork-session and stream-json advanced checks passed')
PY
