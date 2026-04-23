#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[smoke-auth-plugin-update] expected output to contain: $needle" >&2
    exit 1
  fi
}

echo "[smoke-auth-plugin-update] auth status without auth"
set +e
no_auth_output="$(
  ANTHROPIC_API_KEY='' ANTHROPIC_AUTH_TOKEN='' CLAUDE_CODE_OAUTH_TOKEN='' \
    HOME="$(mktemp -d)" \
    bun run start -- auth status --json 2>&1
)"
no_auth_status=$?
set -e
if [[ $no_auth_status -eq 0 ]]; then
  echo "[smoke-auth-plugin-update] expected unauthenticated auth status to exit non-zero" >&2
  exit 1
fi
assert_contains "$no_auth_output" "\"loggedIn\": false"
assert_contains "$no_auth_output" "\"authMethod\": \"none\""

echo "[smoke-auth-plugin-update] auth status with API key"
api_key_output="$(
  ANTHROPIC_API_KEY='dummy' HOME="$(mktemp -d)" bun run start -- auth status --json
)"
assert_contains "$api_key_output" "\"loggedIn\": true"
assert_contains "$api_key_output" "\"authMethod\": \"api_key\""

echo "[smoke-auth-plugin-update] auth logout in isolated HOME"
logout_output="$(
  python3 - <<'PY'
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

home = Path(tempfile.mkdtemp(prefix='cc-auth-home-'))
env = os.environ.copy()
env['HOME'] = str(home)
env['ANTHROPIC_API_KEY'] = 'dummy-key'

try:
    proc = subprocess.run(
        ['bun', 'run', 'start', '--', 'auth', 'logout'],
        cwd='/Users/yanluohao/开发/cc-local',
        env=env,
        capture_output=True,
        text=True,
        timeout=25,
    )
    print(proc.stdout)
    print(proc.stderr)
    config_path = home / '.claude.json'
    print(f'CLAUDE_JSON_EXISTS={config_path.exists()}')
finally:
    shutil.rmtree(home, ignore_errors=True)
PY
)"
assert_contains "$logout_output" "Successfully logged out from your Anthropic account."
assert_contains "$logout_output" "CLAUDE_JSON_EXISTS=True"

echo "[smoke-auth-plugin-update] plugin validate + list"
tmp_home="$(mktemp -d)"
tmp_root="$(mktemp -d)"
plugin_dir="$tmp_root/my-plugin"
mkdir -p "$plugin_dir/.claude-plugin"
cat > "$plugin_dir/.claude-plugin/plugin.json" <<'JSON'
{
  "name": "smoke-plugin",
  "version": "1.0.0",
  "description": "Plugin validation smoke test"
}
JSON

validate_output="$(HOME="$tmp_home" bun run start -- plugin validate "$plugin_dir")"
assert_contains "$validate_output" "Validation passed"

plugin_list_output="$(HOME="$tmp_home" bun run start -- plugin list --json)"
assert_contains "$plugin_list_output" "[]"

echo "[smoke-auth-plugin-update] update command enters check flow"
update_output="$(
  python3 - <<'PY'
import subprocess
cmd=['bun','run','start','--','update']
try:
    p=subprocess.run(cmd,cwd='/Users/yanluohao/开发/cc-local',capture_output=True,text=True,timeout=12)
    print(p.stdout)
    print(p.stderr)
except subprocess.TimeoutExpired as e:
    stdout=e.stdout.decode() if isinstance(e.stdout, bytes) else (e.stdout or '')
    stderr=e.stderr.decode() if isinstance(e.stderr, bytes) else (e.stderr or '')
    print(stdout)
    print(stderr)
PY
)"
assert_contains "$update_output" "Current version:"
assert_contains "$update_output" "Checking for updates"

echo "[smoke-auth-plugin-update] auth/plugin/update smoke checks passed"
