#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[packages-cli] typecheck"
(cd "$ROOT_DIR" && bun run --cwd packages/cli typecheck)

echo "[packages-cli] integration tests"
(cd "$ROOT_DIR" && bun test packages/cli/src/index.test.ts)

echo "[packages-cli] smoke passed"
