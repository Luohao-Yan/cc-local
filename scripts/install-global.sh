#!/bin/bash
# Claude Code Local - macOS/Linux global install script

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Default command name is cclocal (avoids conflict with /usr/bin/cc C compiler)
# Custom name: bash scripts/install-global.sh mycc
CMD_NAME="${1:-cclocal}"

# Validate command name: only letters, digits, hyphens, underscores
if [[ ! "$CMD_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    error "Invalid command name '$CMD_NAME'. Only letters, digits, hyphens and underscores allowed."
fi

echo ""
echo "========================================="
echo "  Claude Code Local - Global Install"
echo "========================================="
echo ""

# Check bun
command -v bun &> /dev/null || error "bun not found. Install: curl -fsSL https://bun.sh/install | bash or npm install -g bun"
info "Found bun: $(which bun)"

# Get project directory
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
info "Project dir: $PROJECT_DIR"

# Clean up legacy commands (cc, ccl)
for old_cmd in cc ccl; do
    for dir in /opt/homebrew/bin /usr/local/bin; do
        if [ -f "$dir/$old_cmd" ] && grep -q "cc-local\|cclocal\|cli.js" "$dir/$old_cmd" 2>/dev/null; then
            rm -f "$dir/$old_cmd" 2>/dev/null || sudo rm -f "$dir/$old_cmd" 2>/dev/null
            info "Cleaned legacy command: $dir/$old_cmd"
        fi
    done
done

# Clean up interfering files
[ -f "$PROJECT_DIR/package-lock.json" ] && rm -f "$PROJECT_DIR/package-lock.json" && info "Cleaned: package-lock.json"
[ -f "$PROJECT_DIR/debug.log" ] && rm -f "$PROJECT_DIR/debug.log" && info "Cleaned: debug.log"

# Clean up official Claude Code residual configs
# Note: no longer deleting ~/.claude.json (contains GrowthBook cache and auth state)
CLAUDE_DIR="$HOME/.claude"
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    rm -f "$CLAUDE_DIR/settings.json"
    info "Cleaned: ~/.claude/settings.json"
fi
if [ -f "$CLAUDE_DIR/settings.local.json" ]; then
    rm -f "$CLAUDE_DIR/settings.local.json"
    info "Cleaned: ~/.claude/settings.local.json"
fi

# Install dependencies
info "Installing dependencies..."
(cd "$PROJECT_DIR" && bun install)

# Build (rebuild every time to ensure updates take effect)
info "Building..."
(cd "$PROJECT_DIR" && bun run build)
if [ ! -f "$PROJECT_DIR/dist/cli.js" ]; then
    error "Build failed, dist/cli.js not found"
fi
info "Built: $PROJECT_DIR/dist/cli.js"

# Determine install directory: prefer /opt/homebrew/bin on Apple Silicon
if [ -d "/opt/homebrew/bin" ] && echo "$PATH" | grep -q "/opt/homebrew/bin"; then
    INSTALL_DIR="/opt/homebrew/bin"
elif echo "$PATH" | grep -q "/usr/local/bin"; then
    INSTALL_DIR="/usr/local/bin"
else
    INSTALL_DIR="/usr/local/bin"
    warn "/usr/local/bin may not be in your PATH"
fi

CMD_PATH="$INSTALL_DIR/$CMD_NAME"

# Check for command name conflicts
EXISTING_CMD="$(which "$CMD_NAME" 2>/dev/null || true)"
if [ -n "$EXISTING_CMD" ] && [ "$EXISTING_CMD" != "$CMD_PATH" ]; then
    error "Command '$CMD_NAME' conflicts with: $EXISTING_CMD\n  Try: bash scripts/install-global.sh cclocal"
fi

# Create global launcher script
TMPFILE="$(mktemp)"
cat > "$TMPFILE" << EOF
#!/bin/bash
exec bun "$PROJECT_DIR/dist/cli.js" "\$@"
EOF
chmod +x "$TMPFILE"

if [ -w "$INSTALL_DIR" ]; then
    mv "$TMPFILE" "$CMD_PATH"
else
    sudo mv "$TMPFILE" "$CMD_PATH"
    sudo chmod +x "$CMD_PATH"
fi

info "Global command created: $CMD_PATH"

# ===== Migrate .env to ~/.claude/models.json =====
MODELS_JSON="$CLAUDE_DIR/models.json"

if [ -f "$PROJECT_DIR/.env" ] && [ ! -f "$MODELS_JSON" ]; then
    MIGRATE_OUTPUT="$(bun "$PROJECT_DIR/scripts/migrate-env-to-json.js" "$PROJECT_DIR" 2>/tmp/migrate_status)"
    MIGRATE_STATUS="$(cat /tmp/migrate_status 2>/dev/null)"
    rm -f /tmp/migrate_status

    if echo "$MIGRATE_STATUS" | grep -q "MIGRATED=1"; then
        mkdir -p "$CLAUDE_DIR"
        echo "$MIGRATE_OUTPUT" > "$MODELS_JSON"
        info "Detected legacy .env config, migrated to $MODELS_JSON"

        MULTI_COUNT="$(echo "$MIGRATE_STATUS" | grep -oE 'MULTI_COUNT=[0-9]+' | cut -d= -f2)"
        if [ -n "$MULTI_COUNT" ] && [ "$MULTI_COUNT" -gt 0 ]; then
            info "  Migrated $MULTI_COUNT multi-model configs"
        fi
        warn "Legacy .env file preserved. You can delete it after verifying the new config."
    fi
fi

echo ""
echo "========================================="
echo "  Done! Run '$CMD_NAME' in any directory to start"
if [ -f "$MODELS_JSON" ]; then
echo "  Model config ready: $MODELS_JSON"
else
echo "  First run will guide you through model setup"
fi
echo "========================================="
