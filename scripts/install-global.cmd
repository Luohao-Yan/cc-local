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

:: Clean up legacy command files (cc.cmd, ccl.cmd) from bun bin dir
for %%F in (cc.cmd ccl.cmd) do (
    if exist "%BUN_DIR%%%F" (
        del "%BUN_DIR%%%F" >nul 2>nul
        echo [*] Cleaned legacy command: %BUN_DIR%%%F
    )
)

:: Clean up stale cclocal.cmd from all common global install dirs
:: (npm, yarn, pnpm may have an old version that takes priority in PATH)
for %%D in (
    "%APPDATA%\npm"
    "%LOCALAPPDATA%\Yarn\bin"
    "%LOCALAPPDATA%\pnpm"
) do (
    if exist "%%~D\cclocal.cmd" (
        del "%%~D\cclocal.cmd" >nul 2>nul
        echo [*] Cleaned stale cclocal.cmd from: %%~D
    )
    if exist "%%~D\cclocal" (
        del "%%~D\cclocal" >nul 2>nul
        echo [*] Cleaned stale cclocal from: %%~D
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

:: 强制删除其他包管理器目录里的旧版 cclocal.cmd（兜底清理，防止 PATH 顺序问题）
if exist "%APPDATA%\npm\cclocal.cmd"        del "%APPDATA%\npm\cclocal.cmd" >nul 2>nul
if exist "%APPDATA%\npm\cclocal"            del "%APPDATA%\npm\cclocal" >nul 2>nul
if exist "%LOCALAPPDATA%\Yarn\bin\cclocal.cmd" del "%LOCALAPPDATA%\Yarn\bin\cclocal.cmd" >nul 2>nul
if exist "%LOCALAPPDATA%\pnpm\cclocal.cmd"  del "%LOCALAPPDATA%\pnpm\cclocal.cmd" >nul 2>nul

:: 创建 cclocal.cmd 全局启动脚本
set "CMD_FILE=%BUN_DIR%cclocal.cmd"
echo @bun "%PROJECT_DIR%\dist\cli.js" %%* > "%CMD_FILE%"

:: ===== .env 自动迁移到 ~/.claude/models.json =====
:: 使用独立 .ps1 脚本执行，解决 bun 读取 GBK 编码 .env 文件乱码问题
set "MODELS_JSON=%CLAUDE_DIR%\models.json"
set "MIGRATED=0"

if exist "%PROJECT_DIR%\.env" (
    if not exist "%MODELS_JSON%" (
        if not exist "%CLAUDE_DIR%" mkdir "%CLAUDE_DIR%"
        powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%\scripts\migrate-env-to-json.ps1" -ProjectDir "%PROJECT_DIR%" -OutFile "%MODELS_JSON%" > "%TEMP%\migrate_result.txt" 2>&1

        findstr /C:"MIGRATED=1" "%TEMP%\migrate_result.txt" >nul 2>nul
        if !errorlevel! equ 0 (
            set "MIGRATED=1"
            echo [OK] Detected legacy .env config, migrated to %MODELS_JSON%
            echo [!] Legacy .env file preserved. You can delete it after verifying the new config.
        ) else (
            if exist "%MODELS_JSON%" del "%MODELS_JSON%" >nul 2>nul
            echo [!] Migration skipped (no valid API key in .env or already configured)
        )
        del "%TEMP%\migrate_result.txt" >nul 2>nul
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
