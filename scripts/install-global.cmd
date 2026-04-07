@echo off
chcp 65001 >nul 2>nul
setlocal

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
        echo [!] Created .env from .env.example, please edit:
        echo     %PROJECT_DIR%\.env
    ) else (
        echo [ERROR] .env and .env.example not found
        exit /b 1
    )
)

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
