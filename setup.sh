#!/usr/bin/env bash
# ============================================
#  一键安装（macOS / Linux / Git Bash）
#  前提：已安装 Git, Python 3.10+, Node.js 20+
# ============================================
set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  修仙小说生成器 - 一键安装"
echo "============================================"
echo

# ----- 检查依赖 -----
command -v python >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1 || {
    echo "[错误] 未找到 Python，请先安装 Python 3.10+"
    exit 1
}
command -v node >/dev/null 2>&1 || {
    echo "[错误] 未找到 Node.js，请先安装 Node.js 20+"
    exit 1
}

PYTHON=$(command -v python3 || command -v python)

# 检测 venv 激活路径（Windows Git Bash vs Unix）
if [ -d "backend/venv/Scripts" ]; then
    VENV_ACTIVATE="backend/venv/Scripts/activate"
else
    VENV_ACTIVATE="backend/venv/bin/activate"
fi

# ===== 后端 =====
echo "[1/5] 创建 Python 虚拟环境..."
if [ ! -f "$VENV_ACTIVATE" ]; then
    "$PYTHON" -m venv backend/venv
    if [ -d "backend/venv/Scripts" ]; then
        VENV_ACTIVATE="backend/venv/Scripts/activate"
    else
        VENV_ACTIVATE="backend/venv/bin/activate"
    fi
else
    echo "      已存在，跳过"
fi

echo "[2/5] 安装后端依赖..."
# shellcheck disable=SC1090
source "$VENV_ACTIVATE"
pip install -r backend/requirements.txt -q
pip install python-dotenv -q

# ----- .env -----
echo "[3/5] 配置环境变量..."
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "      已创建 backend/.env，请编辑填入 ANTHROPIC_API_KEY"
    echo
    echo "      *** 打开 backend/.env 填写你的 API Key 后再启动 ***"
    echo
else
    echo "      backend/.env 已存在，跳过"
fi

# ===== 前端 =====
echo "[4/5] 安装前端依赖..."
(cd frontend && npm install --legacy-peer-deps)

# ===== 数据库恢复 =====
echo "[5/5] 恢复数据库..."
if [ -f "backend/data/novels_dump.sql" ]; then
    if [ ! -f "backend/data/novels.db" ]; then
        "$PYTHON" backend/scripts/restore_db.py
    else
        echo "      novels.db 已存在，跳过（如需覆盖: python backend/scripts/restore_db.py --force）"
    fi
else
    echo "      无 SQL dump，首次启动时会自动建库"
fi

echo
echo "============================================"
echo "  安装完成！"
echo
echo "  1. 编辑 backend/.env 填入 ANTHROPIC_API_KEY"
echo "  2. 运行 ./start.sh 启动项目"
echo "  3. 浏览器访问 http://localhost:5173"
echo "============================================"
