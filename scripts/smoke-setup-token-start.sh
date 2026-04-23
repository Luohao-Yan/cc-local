#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[smoke-setup-token-start] expected output to contain: $needle" >&2
    exit 1
  fi
}

echo "[smoke-setup-token-start] setup-token startup"
setup_output="$(
  python3 - <<'PY'
import os, pty, select, signal, subprocess, time
cmd=['bun','run','start','--','setup-token']
master, slave = pty.openpty()
p = subprocess.Popen(cmd, cwd='/Users/yanluohao/开发/cc-local', stdin=slave, stdout=slave, stderr=slave, text=False)
os.close(slave)
out = b''
deadline = time.time() + 12
try:
    while time.time() < deadline:
        r, _, _ = select.select([master], [], [], 0.5)
        if master in r:
            chunk = os.read(master, 4096)
            if not chunk:
                break
            out += chunk
            if b'Paste code here if prompted' in out:
                break
finally:
    try:
        os.kill(p.pid, signal.SIGINT)
    except ProcessLookupError:
        pass
    try:
        p.wait(timeout=2)
    except subprocess.TimeoutExpired:
        p.kill()
        p.wait()
    os.close(master)
print(out.decode('utf-8', errors='ignore'))
PY
)"
assert_contains "$setup_output" "Opening"
assert_contains "$setup_output" "browser"
assert_contains "$setup_output" "Paste"
assert_contains "$setup_output" "code"

echo "[smoke-setup-token-start] setup-token startup checks passed"
