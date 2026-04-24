@echo off
REM ============================================
REM  一键安装（Windows）
REM  前提：已安装 Git, Python 3.10+, Node.js 20+
REM ============================================
setlocal
cd /d "%~dp0"

echo ============================================
echo   修仙小说生成器 - 一键安装
echo ============================================
echo.

REM ----- 检查 Python -----
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.10+
    pause & exit /b 1
)

REM ----- 检查 Node -----
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 20+
    pause & exit /b 1
)

REM ===== 后端 =====
echo.
echo [1/5] 创建 Python 虚拟环境...
if not exist "backend\venv\Scripts\activate.bat" (
    python -m venv backend\venv
) else (
    echo       已存在，跳过
)

echo [2/5] 安装后端依赖...
call backend\venv\Scripts\activate.bat
pip install -r backend\requirements.txt -q
pip install python-dotenv -q

REM ----- .env -----
echo [3/5] 配置环境变量...
if not exist "backend\.env" (
    copy backend\.env.example backend\.env >nul
    echo       已创建 backend\.env，请编辑填入 ANTHROPIC_API_KEY
    echo.
    echo       *** 打开 backend\.env 填写你的 API Key 后再启动 ***
    echo.
) else (
    echo       backend\.env 已存在，跳过
)

REM ===== 前端 =====
echo [4/5] 安装前端依赖...
cd frontend
call npm install --legacy-peer-deps
cd ..

REM ===== 数据库恢复 =====
echo [5/5] 恢复数据库...
if exist "backend\data\novels_dump.sql" (
    if not exist "backend\data\novels.db" (
        python backend\scripts\restore_db.py
    ) else (
        echo       novels.db 已存在，跳过（如需覆盖: python backend\scripts\restore_db.py --force）
    )
) else (
    echo       无 SQL dump，首次启动时会自动建库
)

echo.
echo ============================================
echo   安装完成！
echo.
echo   1. 编辑 backend\.env 填入 ANTHROPIC_API_KEY
echo   2. 双击 start.bat 启动项目
echo   3. 浏览器访问 http://localhost:5173
echo ============================================
pause
endlocal
