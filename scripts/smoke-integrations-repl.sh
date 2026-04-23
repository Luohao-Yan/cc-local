#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[smoke-integrations-repl] repl startup + integration flags"
python3 - <<'PY'
import os
import pathlib
import pty
import select
import shutil
import signal
import subprocess
import tempfile
import time

root = '/Users/yanluohao/开发/cc-local'
dist = os.path.join(root, 'dist', 'cli.js')

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

# REPL startup
master, slave = pty.openpty()
p = subprocess.Popen(['bun', 'run', 'start'], cwd=root, stdin=slave, stdout=slave, stderr=slave, text=False)
os.close(slave)
out = b''
deadline = time.time() + 8
try:
    while time.time() < deadline:
        r, _, _ = select.select([master], [], [], 0.5)
        if master in r:
            chunk = os.read(master, 4096)
            if not chunk:
                break
            out += chunk
            if b'Claude Code' in out and b'? for shortcuts' in out:
                break
finally:
    try:
        os.kill(p.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    try:
        p.wait(timeout=2)
    except subprocess.TimeoutExpired:
        pass
    os.close(master)

decoded = out.decode('utf-8', errors='ignore')
ensure('Claude' in decoded and 'Code' in decoded, 'REPL banner missing')
ensure('shortcuts' in decoded, 'REPL shortcut hint missing')

# temp git repo for worktree/tmux
repo = tempfile.mkdtemp(prefix='cclocal-integrations-')
subprocess.run(['git', 'init'], cwd=repo, check=True, capture_output=True)
pathlib.Path(repo, 'README.md').write_text('hello\n')
subprocess.run(['git', 'add', 'README.md'], cwd=repo, check=True, capture_output=True)
subprocess.run(['git', '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'init'], cwd=repo, check=True, capture_output=True)

try:
    p_worktree = subprocess.run(['bun', dist, '--worktree', 'smoke', '--print', 'say ok'], cwd=repo, capture_output=True, text=True, timeout=25)
    ensure(p_worktree.returncode == 0, 'worktree command failed')
    wt_list = subprocess.run(['git', 'worktree', 'list', '--porcelain'], cwd=repo, capture_output=True, text=True, check=True)
    ensure('.claude/worktrees/smoke' in wt_list.stdout, 'worktree path missing from git worktree list')

    p_ide = subprocess.run(['bun', dist, '--ide', '--print', 'say ok'], cwd=repo, capture_output=True, text=True, timeout=25)
    ensure(p_ide.returncode == 0 and 'ok' in p_ide.stdout, '--ide print flow failed')

    p_chrome = subprocess.run(['bun', dist, '--chrome', '--print', 'say ok'], cwd=repo, capture_output=True, text=True, timeout=25)
    ensure(p_chrome.returncode == 0 and 'ok' in p_chrome.stdout, '--chrome print flow failed')

    p_tmux = subprocess.run(['bun', dist, '--worktree', 'smoke', '--tmux', '--print', 'say ok'], cwd=repo, capture_output=True, text=True, timeout=25)
    ensure(p_tmux.returncode != 0, '--tmux unexpectedly succeeded without tmux')
    ensure('tmux is not installed' in p_tmux.stderr, 'expected tmux missing dependency error')
finally:
    shutil.rmtree(repo, ignore_errors=True)

print('integration and REPL checks passed')
PY
