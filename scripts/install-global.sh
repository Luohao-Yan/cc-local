#!/bin/bash
# Claude Code Local - macOS/Linux 全局安装脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# 默认命令名为 cclocal，避免与系统 /usr/bin/cc (C 编译器) 冲突
# 用户可通过参数自定义，例如: bash scripts/install-global.sh mycc
CMD_NAME="${1:-cclocal}"

# 校验命令名合法性：只允许字母、数字、短横线、下划线
if [[ ! "$CMD_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    error "命令名 '$CMD_NAME' 不合法，只允许字母、数字、短横线和下划线"
fi

echo ""
echo "========================================="
echo "  Claude Code Local - 全局安装"
echo "========================================="
echo ""

# 检查 bun
command -v bun &> /dev/null || error "未检测到 bun，请先安装：curl -fsSL https://bun.sh/install | bash 或 npm install -g bun"
info "检测到 bun: $(which bun)"

# 获取项目目录
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
info "项目目录: $PROJECT_DIR"

# 检查 .env
if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        warn "已从 .env.example 创建 .env，请编辑填入你的 API 信息："
        warn "  $PROJECT_DIR/.env"
    else
        error "未找到 .env 和 .env.example"
    fi
fi

# 打包
if [ ! -f "$PROJECT_DIR/dist/cli.js" ]; then
    warn "未找到打包文件，正在打包..."
    (cd "$PROJECT_DIR" && bun run build)
fi
# 打包后再次检查产物是否存在
if [ ! -f "$PROJECT_DIR/dist/cli.js" ]; then
    error "打包失败，未生成 dist/cli.js"
fi
info "打包文件: $PROJECT_DIR/dist/cli.js"

# 确定安装目录：Apple Silicon Mac 优先使用 /opt/homebrew/bin
if [ -d "/opt/homebrew/bin" ] && echo "$PATH" | grep -q "/opt/homebrew/bin"; then
    INSTALL_DIR="/opt/homebrew/bin"
elif echo "$PATH" | grep -q "/usr/local/bin"; then
    INSTALL_DIR="/usr/local/bin"
else
    INSTALL_DIR="/usr/local/bin"
    warn "/usr/local/bin 可能不在你的 PATH 中，安装后请确认 PATH 配置"
fi

CMD_PATH="$INSTALL_DIR/$CMD_NAME"

# 检查命令名是否与系统命令冲突
EXISTING_CMD="$(which "$CMD_NAME" 2>/dev/null || true)"
if [ -n "$EXISTING_CMD" ] && [ "$EXISTING_CMD" != "$CMD_PATH" ]; then
    error "命令名 '$CMD_NAME' 与已有命令冲突: $EXISTING_CMD\n  请使用其他名称，例如: bash scripts/install-global.sh cclocal"
fi

# 创建全局启动脚本
TMPFILE="$(mktemp)"
cat > "$TMPFILE" << EOF
#!/bin/bash
exec bun --env-file="$PROJECT_DIR/.env" "$PROJECT_DIR/dist/cli.js" "\$@"
EOF
chmod +x "$TMPFILE"

if [ -w "$INSTALL_DIR" ]; then
    mv "$TMPFILE" "$CMD_PATH"
else
    sudo mv "$TMPFILE" "$CMD_PATH"
    sudo chmod +x "$CMD_PATH"
fi

info "全局命令已创建: $CMD_PATH"
echo ""
echo "========================================="
echo "  安装完成！在任意目录输入 $CMD_NAME 即可启动"
echo "========================================="
