#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

python3 - <<'PY'
import os
import pty
import re
import select
import signal
import time
from pathlib import Path

ROOT = Path('/Users/yanluohao/开发/cc-local').resolve()
CLI = str(ROOT / 'dist' / 'cli.js')
project_dir = Path.home() / '.claude' / 'projects' / re.sub(r'[^a-zA-Z0-9]', '-', str(ROOT))
project_dir.mkdir(parents=True, exist_ok=True)
ANSI_RE = re.compile(r'\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\].*?(?:\x07|\x1b\\\\))')


def clean(text: str) -> str:
    return ANSI_RE.sub('', text).replace('\r', '')


def start_repl():
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(str(ROOT))
        os.execvpe('bun', ['bun', CLI], os.environ)
    return pid, fd, ''


def pump(fd: int, buffer: str, timeout: float) -> str:
    end = time.time() + timeout
    while time.time() < end:
        ready, _, _ = select.select([fd], [], [], 0.25)
        if not ready:
            continue
        chunk = os.read(fd, 8192)
        if not chunk:
            break
        buffer += chunk.decode('utf-8', 'ignore')
    return buffer


def wait_for(fd: int, buffer: str, patterns: tuple[str, ...], timeout: float) -> str:
    end = time.time() + timeout
    while time.time() < end:
        buffer = pump(fd, buffer, 0.5)
        cleaned = clean(buffer)
        if all(pattern in cleaned for pattern in patterns):
            return buffer
    raise RuntimeError(
        f'timeout waiting for patterns: {patterns}; buffer={clean(buffer)[-2000:]}'
    )


def stop_repl(pid: int, fd: int) -> None:
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        os.close(fd)
    except OSError:
        pass
    try:
        os.waitpid(pid, 0)
    except ChildProcessError:
        pass


# Session 1: slash command regression
pid, fd, buffer = start_repl()
try:
    buffer = wait_for(fd, buffer, ('ClaudeCode', 'shortcuts'), timeout=25)
    os.write(fd, b'/help\r')
    buffer = wait_for(fd, buffer, ('/help', 'Formorehelp:', 'Esctocancel'), timeout=15)
finally:
    stop_repl(pid, fd)


# Session 2: tool calling + session persistence
before_time = time.time()
pid, fd, buffer = start_repl()
try:
    buffer = wait_for(fd, buffer, ('ClaudeCode', 'shortcuts'), timeout=25)
    os.write(fd, b'run bash command pwd and answer only done\r')

    matched_file = None
    end = time.time() + 75
    while time.time() < end:
        buffer = pump(fd, buffer, 0.5)
        for candidate in sorted(project_dir.glob('*.jsonl'), key=lambda p: p.stat().st_mtime, reverse=True):
            if candidate.stat().st_mtime < before_time:
                continue
            text = candidate.read_text(errors='ignore')
            if (
                'run bash command pwd and answer only done' in text
                and '"name":"Bash"' in text
                and '"text":"done"' in text
            ):
                matched_file = candidate
                break
        if matched_file:
            break

    if matched_file is None:
        raise RuntimeError('did not observe persisted REPL session with tool call evidence')

    print(f'REPL_SESSION_FILE={matched_file}')
    print('REPL regression checks passed')
finally:
    stop_repl(pid, fd)
PY
