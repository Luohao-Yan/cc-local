@echo off
REM KSCC Proxy Launcher for Windows
REM This script starts the kscc proxy server to allow cclocal to use kscc's models

setlocal

set PORT=8765
if defined KSCC_PROXY_PORT set PORT=%KSCC_PROXY_PORT%

echo Starting KSCC Proxy on port %PORT%...
echo.

REM Start the proxy
start /B bun run D:/develop/cc-local/packages/cli/src/proxy/kscc-proxy.ts

REM Wait for server to start
timeout /t 2 /nobreak >nul

echo.
echo === KSCC Proxy Started ===
echo.
echo To use with cclocal, add to ~/.claude/settings.json:
echo.
echo {
echo   "env": {
echo     "ANTHROPIC_BASE_URL": "http://localhost:%PORT%",
echo     "ANTHROPIC_API_KEY": "any-key-works"
echo   },
echo   "model": "glm-5"
echo }
echo.
echo Available models: glm-5, glm-5.1, kimi-k2.5
echo.
echo Press Ctrl+C to stop the proxy
echo.

REM Keep the script running
pause

endlocal