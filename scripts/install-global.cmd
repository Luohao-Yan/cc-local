@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion

echo.
echo =========================================
echo   Claude Code Local - Windows Install
echo =========================================
echo.

:: Check bun
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] bun not found. Install: npm install -g bun
    exit /b 1
)

:: Get bun directory
for /f "delims=" %%i in ('where bun') do (
    set "BUN_DIR=%%~dpi"
    goto :found_bun
)
:found_bun
echo [OK] bun path: %BUN_DIR%

:: Get project directory
set "PROJECT_DIR=%~dp0.."
pushd "%PROJECT_DIR%"
set "PROJECT_DIR=%CD%"
popd

:: Check .env
if not exist "%PROJECT_DIR%\.env" (
    echo [!] .env not found
    if exist "%PROJECT_DIR%\.env.example" (
        copy "%PROJECT_DIR%\.env.example" "%PROJECT_DIR%\.env" >nul
        echo [!] Created .env from .env.example
        echo [!] IMPORTANT: Please edit .env before using cclocal:
        echo     %PROJECT_DIR%\.env
        echo.
        echo     Required settings:
        echo       ANTHROPIC_API_KEY=your-actual-api-key
        echo       ANTHROPIC_BASE_URL=https://your-api-endpoint.com/api
        echo       ANTHROPIC_MODEL=your-model-name
        echo.
    ) else (
        echo [ERROR] .env and .env.example not found
        exit /b 1
    )
) else (
    :: Warn if .env still contains placeholder values
    findstr /C:"your-api-key-here" "%PROJECT_DIR%\.env" >nul 2>nul
    if !errorlevel! equ 0 (
        echo [!] WARNING: .env contains placeholder values, please edit:
        echo     %PROJECT_DIR%\.env
    )
)

:: Clean up legacy command files from previous versions (cc.cmd, ccl.cmd)
:: These old versions lack --env-file and cause .env loading issues
for %%F in (cc.cmd ccl.cmd) do (
    if exist "%BUN_DIR%%%F" (
        del "%BUN_DIR%%%F" >nul 2>nul
        echo [*] Cleaned legacy command: %BUN_DIR%%%F
    )
)

:: Clean up files that interfere with bun build (e.g. from npm install)
if exist "%PROJECT_DIR%\package-lock.json" (
    del "%PROJECT_DIR%\package-lock.json" >nul 2>nul
    echo [*] Cleaned: package-lock.json (npm artifact, conflicts with bun.lock)
)
if exist "%PROJECT_DIR%\debug.log" (
    del "%PROJECT_DIR%\debug.log" >nul 2>nul
    echo [*] Cleaned: debug.log
)

:: Clean up official Claude Code residual configs that override .env settings
:: ~/.claude/settings.json may contain model/auth from official Claude Code
:: ~/.claude.json may contain cached GrowthBook features and OAuth tokens
:: These take precedence over .env and cause model/auth conflicts
set "CLAUDE_DIR=%USERPROFILE%\.claude"
if exist "%CLAUDE_DIR%\settings.json" (
    del "%CLAUDE_DIR%\settings.json" >nul 2>nul
    echo [*] Cleaned: ~/.claude/settings.json (official Claude Code residual config)
)
if exist "%CLAUDE_DIR%\settings.local.json" (
    del "%CLAUDE_DIR%\settings.local.json" >nul 2>nul
    echo [*] Cleaned: ~/.claude/settings.local.json
)
if exist "%USERPROFILE%\.claude.json" (
    del "%USERPROFILE%\.claude.json" >nul 2>nul
    echo [*] Cleaned: ~/.claude.json (official Claude Code global config)
)

:: Install dependencies with bun
echo [*] Installing dependencies...
pushd "%PROJECT_DIR%"
call bun install
popd

:: Build every time to ensure updates take effect
echo [*] Building project...
pushd "%PROJECT_DIR%"
call bun run scripts/build-external.ts
popd
if not exist "%PROJECT_DIR%\dist\cli.js" (
    echo [ERROR] Build failed
    exit /b 1
)
echo [OK] Built: %PROJECT_DIR%\dist\cli.js

:: Create cclocal.cmd
set "CMD_FILE=%BUN_DIR%cclocal.cmd"
echo @bun --env-file="%PROJECT_DIR%\.env" "%PROJECT_DIR%\dist\cli.js" %%* > "%CMD_FILE%"

if exist "%CMD_FILE%" (
    echo [OK] Global command created: %CMD_FILE%
    echo.
    echo =========================================
    echo   Done! Open a new terminal and run: cclocal
    echo =========================================
) else (
    echo [ERROR] Failed to create cclocal.cmd
    exit /b 1
)

endlocal
