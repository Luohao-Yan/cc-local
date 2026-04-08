@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion

echo.
echo =========================================
echo   Claude Code Local - Windows Install
echo =========================================
echo.

:: 检查 bun
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] bun not found. Install: npm install -g bun
    exit /b 1
)

:: 获取 bun 目录
for /f "delims=" %%i in ('where bun') do (
    set "BUN_DIR=%%~dpi"
    goto :found_bun
)
:found_bun
echo [OK] bun path: %BUN_DIR%

:: 获取项目目录
set "PROJECT_DIR=%~dp0.."
pushd "%PROJECT_DIR%"
set "PROJECT_DIR=%CD%"
popd

:: Clean up legacy command files (cc.cmd, ccl.cmd)
for %%F in (cc.cmd ccl.cmd) do (
    if exist "%BUN_DIR%%%F" (
        del "%BUN_DIR%%%F" >nul 2>nul
        echo [*] Cleaned legacy command: %BUN_DIR%%%F
    )
)

:: Clean up files that interfere with bun build
if exist "%PROJECT_DIR%\package-lock.json" (
    del "%PROJECT_DIR%\package-lock.json" >nul 2>nul
    echo [*] Cleaned: package-lock.json
)
if exist "%PROJECT_DIR%\debug.log" (
    del "%PROJECT_DIR%\debug.log" >nul 2>nul
    echo [*] Cleaned: debug.log
)

:: Clean up official Claude Code residual configs
:: Note: no longer deleting ~/.claude.json (contains GrowthBook cache and auth state)
set "CLAUDE_DIR=%USERPROFILE%\.claude"
if exist "%CLAUDE_DIR%\settings.json" (
    del "%CLAUDE_DIR%\settings.json" >nul 2>nul
    echo [*] Cleaned: ~/.claude/settings.json
)
if exist "%CLAUDE_DIR%\settings.local.json" (
    del "%CLAUDE_DIR%\settings.local.json" >nul 2>nul
    echo [*] Cleaned: ~/.claude/settings.local.json
)

:: Install dependencies
echo [*] Installing dependencies...
pushd "%PROJECT_DIR%"
call bun install
popd

:: Build (rebuild every time to ensure updates take effect)
echo [*] Building...
pushd "%PROJECT_DIR%"
call bun run scripts/build-external.ts
popd
if not exist "%PROJECT_DIR%\dist\cli.js" (
    echo [ERROR] Build failed
    exit /b 1
)
echo [OK] Built: %PROJECT_DIR%\dist\cli.js

:: 创建 cclocal.cmd 全局启动脚本
set "CMD_FILE=%BUN_DIR%cclocal.cmd"
echo @bun "%PROJECT_DIR%\dist\cli.js" %%* > "%CMD_FILE%"

:: ===== .env 自动迁移到 ~/.claude/models.json =====
set "MODELS_JSON=%CLAUDE_DIR%\models.json"
set "MIGRATED=0"

if exist "%PROJECT_DIR%\.env" (
    if not exist "%MODELS_JSON%" (
        :: 使用 bun 执行迁移脚本（解析 .env 并生成 JSON）
        if not exist "%CLAUDE_DIR%" mkdir "%CLAUDE_DIR%"
        bun "%PROJECT_DIR%\scripts\migrate-env-to-json.js" "%PROJECT_DIR%" > "%MODELS_JSON%" 2>"%TEMP%\migrate_status.txt"

        :: Check migration result
        findstr /C:"MIGRATED=1" "%TEMP%\migrate_status.txt" >nul 2>nul
        if !errorlevel! equ 0 (
            set "MIGRATED=1"
            echo [OK] Detected legacy .env config, migrated to %MODELS_JSON%

            :: Extract multi-model count
            for /f "tokens=2 delims==" %%A in ('findstr /C:"MULTI_COUNT" "%TEMP%\migrate_status.txt"') do (
                if %%A gtr 0 echo [OK]   Migrated %%A multi-model configs
            )
            echo [!] Legacy .env file preserved. You can delete it after verifying the new config.
        ) else (
            :: Migration script determined no migration needed, delete empty file
            del "%MODELS_JSON%" >nul 2>nul
        )
        del "%TEMP%\migrate_status.txt" >nul 2>nul
    )
)

if exist "%CMD_FILE%" (
    echo [OK] 全局命令已创建: %CMD_FILE%
    echo.
    echo =========================================
    if "!MIGRATED!"=="1" (
        echo   Done! Open a new terminal and run: cclocal
        echo   Model config migrated from .env to models.json
    ) else if exist "%MODELS_JSON%" (
        echo   Done! Open a new terminal and run: cclocal
        echo   Model config ready: %MODELS_JSON%
    ) else (
        echo   Done! Open a new terminal and run: cclocal
        echo   First run will guide you through model setup
    )
    echo =========================================
) else (
    echo [ERROR] 创建 cclocal.cmd 失败
    exit /b 1
)

endlocal
