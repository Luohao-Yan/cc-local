@echo off
setlocal

echo.
echo =========================================
echo   Claude Code Local - Windows 全局安装
echo =========================================
echo.

:: 检查 bun 是否安装
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 bun，请先安装：npm install -g bun
    exit /b 1
)

:: 获取 bun 所在目录
for /f "delims=" %%i in ('where bun') do (
    set "BUN_DIR=%%~dpi"
    goto :found_bun
)
:found_bun
echo [✓] 检测到 bun 路径: %BUN_DIR%

:: 获取项目目录（脚本所在目录的上一级）
set "PROJECT_DIR=%~dp0.."
pushd "%PROJECT_DIR%"
set "PROJECT_DIR=%CD%"
popd

:: 检查 .env 文件
if not exist "%PROJECT_DIR%\.env" (
    echo [!] 未找到 .env 文件
    if exist "%PROJECT_DIR%\.env.example" (
        copy "%PROJECT_DIR%\.env.example" "%PROJECT_DIR%\.env" >nul
        echo [!] 已从 .env.example 创建 .env，请编辑填入你的 API 信息：
        echo     %PROJECT_DIR%\.env
    ) else (
        echo [错误] 未找到 .env 和 .env.example
        exit /b 1
    )
)

:: 每次都重新构建，确保代码更新后全局命令也更新
echo [*] 正在构建项目...
pushd "%PROJECT_DIR%"
call bun run build
popd
if not exist "%PROJECT_DIR%\dist\cli.js" (
    echo [错误] 打包失败
    exit /b 1
)
echo [✓] 打包文件: %PROJECT_DIR%\dist\cli.js

:: 创建 cclocal.cmd（与 macOS/Linux 命令名一致）
set "CMD_FILE=%BUN_DIR%cclocal.cmd"
echo @bun --env-file="%PROJECT_DIR%\.env" "%PROJECT_DIR%\dist\cli.js" %%* > "%CMD_FILE%"

if exist "%CMD_FILE%" (
    echo [✓] 全局命令已创建: %CMD_FILE%
    echo.
    echo =========================================
    echo   安装完成！
    echo   打开新的命令行窗口，在任意目录输入 cclocal 即可启动
    echo =========================================
) else (
    echo [错误] 创建 cclocal.cmd 失败，请检查目录权限
    exit /b 1
)

endlocal
