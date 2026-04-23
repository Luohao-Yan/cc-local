#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT_DIR/scripts/acceptance-complete.sh"
