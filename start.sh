#!/usr/bin/env bash
# 一键启动（Git Bash / macOS / Linux）
#   用法:  ./start.sh
#   停止:  Ctrl+C  (会同时关掉前后端)

set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  启动 修仙小说生成器"
echo "============================================"

# ---- 定位 venv 的 activate 脚本（Windows vs Unix） ----
if [ -f "backend/venv/Scripts/activate" ]; then
    VENV_ACTIVATE="backend/venv/Scripts/activate"   # Windows (Git Bash)
elif [ -f "backend/venv/bin/activate" ]; then
    VENV_ACTIVATE="backend/venv/bin/activate"       # macOS / Linux
else
    echo "[错误] 未找到 backend/venv，请先:"
    echo "  cd backend && python -m venv venv && source \$VENV_ACTIVATE && pip install -r requirements.txt"
    exit 1
fi

[ -f "backend/.env" ] || { echo "[错误] 缺少 backend/.env，请 cp backend/.env.example backend/.env 并填 API Key"; exit 1; }
[ -d "frontend/node_modules" ] || { echo "[错误] 缺少 frontend/node_modules，请先 cd frontend && npm install"; exit 1; }

# ---- 退出时清理子进程 ----
cleanup() {
    echo ""
    echo "正在停止..."
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

# ---- 启动后端 ----
echo "[1/2] 启动后端 http://localhost:8000"
(
    cd backend
    # shellcheck disable=SC1090
    source "../$VENV_ACTIVATE"
    exec uvicorn app.main:app --reload --port 8000
) &
BACKEND_PID=$!

sleep 3

# ---- 启动前端 ----
echo "[2/2] 启动前端 http://localhost:5173"
(
    cd frontend
    exec npm run dev
) &
FRONTEND_PID=$!

# ---- 等待前端就绪并打开浏览器 ----
echo ""
echo "等待前端就绪..."
URL="http://localhost:5173"
for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" --max-time 1 "$URL" | grep -q "200"; then
        echo "前端已就绪，打开浏览器..."
        case "$(uname -s)" in
            MINGW*|MSYS*|CYGWIN*) start "" "$URL" ;;   # Git Bash on Windows
            Darwin)               open "$URL" ;;       # macOS
            *)                    xdg-open "$URL" 2>/dev/null || true ;;
        esac
        break
    fi
    sleep 1
done

echo ""
echo "============================================"
echo "  访问地址: $URL"
echo "  停止: Ctrl+C"
echo "============================================"

# 等待任一子进程退出
wait
