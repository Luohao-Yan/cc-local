#!/bin/bash
#
# KSCC Proxy Launcher
# This script starts the kscc proxy server to allow cclocal to use kscc's models
#

PORT=${KSCC_PROXY_PORT:-8765}

echo "Starting KSCC Proxy on port $PORT..."
echo ""

# Start the proxy in background
bun run D:/develop/cc-local/packages/cli/src/proxy/kscc-proxy.ts &

# Wait for server to start
sleep 2

echo ""
echo "=== KSCC Proxy Started ==="
echo ""
echo "To use with cclocal, add to ~/.claude/settings.json:"
echo ""
echo '{'
echo '  "env": {'
echo '    "ANTHROPIC_BASE_URL": "http://localhost:'$PORT'",'
echo '    "ANTHROPIC_API_KEY": "any-key-works"'
echo '  },'
echo '  "model": "glm-5"'
echo '}'
echo ""
echo "Available models: glm-5, glm-5.1, kimi-k2.5"
echo ""
echo "Press Ctrl+C to stop the proxy"
echo ""

# Wait for background process
wait