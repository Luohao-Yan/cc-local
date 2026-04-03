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

echo ""
echo "========================================="
echo "  Claude Code Local - 全局安装"
echo "========================================="
echo ""

# 检查 bun
command -v bun &> /dev/null || error "未检测到 bun，请先安装：brew install bun 或 npm install -g bun"
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
info "打包文件: $PROJECT_DIR/dist/cli.js"

# 创建全局命令
INSTALL_DIR="/usr/local/bin"
CC_PATH="$INSTALL_DIR/cc"

cat > /tmp/cc-local-launcher.sh << EOF
#!/bin/bash
exec bun --env-file="$PROJECT_DIR/.env" "$PROJECT_DIR/dist/cli.js" "\$@"
EOF

if [ -w "$INSTALL_DIR" ]; then
    mv /tmp/cc-local-launcher.sh "$CC_PATH"
else
    sudo mv /tmp/cc-local-launcher.sh "$CC_PATH"
fi
chmod +x "$CC_PATH"

info "全局命令已创建: $CC_PATH"
echo ""
echo "========================================="
echo "  安装完成！在任意目录输入 cc 即可启动"
echo "========================================="
