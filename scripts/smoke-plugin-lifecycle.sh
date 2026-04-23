#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "[smoke-plugin-lifecycle] expected output to contain: $needle" >&2
    exit 1
  fi
}

tmp_home="$(mktemp -d)"
root="$(mktemp -d)"
mkdir -p "$root/.claude-plugin" "$root/plugins/smoke-plugin/.claude-plugin"

cat > "$root/.claude-plugin/marketplace.json" <<'JSON'
{
  "name": "local-smoke-market",
  "owner": { "name": "Codex" },
  "plugins": [
    {
      "name": "smoke-plugin",
      "source": "./plugins/smoke-plugin",
      "description": "Local smoke plugin",
      "version": "1.0.0"
    }
  ]
}
JSON

cat > "$root/plugins/smoke-plugin/.claude-plugin/plugin.json" <<'JSON'
{
  "name": "smoke-plugin",
  "version": "1.0.0",
  "description": "Install/update smoke plugin"
}
JSON

echo "[smoke-plugin-lifecycle] marketplace add"
marketplace_add_output="$(HOME="$tmp_home" bun run start -- plugin marketplace add "$root")"
assert_contains "$marketplace_add_output" "Successfully added marketplace"

echo "[smoke-plugin-lifecycle] install"
install_output="$(HOME="$tmp_home" bun run start -- plugin install smoke-plugin@local-smoke-market)"
assert_contains "$install_output" "Successfully installed plugin"

echo "[smoke-plugin-lifecycle] update"
cat > "$root/.claude-plugin/marketplace.json" <<'JSON'
{
  "name": "local-smoke-market",
  "owner": { "name": "Codex" },
  "plugins": [
    {
      "name": "smoke-plugin",
      "source": "./plugins/smoke-plugin",
      "description": "Local smoke plugin",
      "version": "1.1.0"
    }
  ]
}
JSON

cat > "$root/plugins/smoke-plugin/.claude-plugin/plugin.json" <<'JSON'
{
  "name": "smoke-plugin",
  "version": "1.1.0",
  "description": "Install/update smoke plugin"
}
JSON

marketplace_update_output="$(HOME="$tmp_home" bun run start -- plugin marketplace update local-smoke-market)"
assert_contains "$marketplace_update_output" "Successfully updated marketplace"
plugin_update_output="$(HOME="$tmp_home" bun run start -- plugin update smoke-plugin@local-smoke-market)"
assert_contains "$plugin_update_output" "updated from 1.0.0 to 1.1.0"

echo "[smoke-plugin-lifecycle] uninstall"
uninstall_output="$(HOME="$tmp_home" bun run start -- plugin uninstall smoke-plugin@local-smoke-market)"
assert_contains "$uninstall_output" "Successfully uninstalled plugin"

echo "[smoke-plugin-lifecycle] plugin lifecycle checks passed"
