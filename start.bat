@echo off
REM 一键启动（Windows）—— 双击或在 CMD 中运行
REM 会打开两个独立窗口分别运行后端和前端，关闭窗口即可停止

setlocal
cd /d "%~dp0"

echo ============================================
echo   启动 修仙小说生成器
echo ============================================
echo.

REM ----- 前置检查 -----
if not exist "backend\venv\Scripts\activate.bat" (
    echo [错误] 未找到后端虚拟环境 backend\venv
    echo   请先执行:
    echo     cd backend ^&^& python -m venv venv ^&^& venv\Scripts\activate.bat ^&^& pip install -r requirements.txt
    pause
    exit /b 1
)

if not exist "backend\.env" (
    echo [错误] 未找到 backend\.env
    echo   请先: copy backend\.env.example backend\.env  并填入 ANTHROPIC_API_KEY
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo [错误] 未找到 frontend\node_modules
    echo   请先: cd frontend ^&^& npm install
    pause
    exit /b 1
)

REM ----- 启动后端（新窗口） -----
echo [1/2] 启动后端 http://localhost:8000
start "novel-backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

REM ----- 等待后端起来 -----
timeout /t 3 /nobreak >nul

REM ----- 启动前端（新窗口） -----
echo [2/2] 启动前端 http://localhost:5173
start "novel-frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

REM ----- 等待前端就绪后自动打开浏览器（最多 30 秒） -----
echo.
echo 等待前端就绪...
powershell -NoProfile -Command "for($i=0;$i -lt 30;$i++){try{Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0}catch{Start-Sleep -Seconds 1}}; exit 1"

if errorlevel 1 (
    echo [警告] 前端 30 秒内未就绪，请检查 novel-frontend 窗口日志
) else (
    echo 前端已就绪，打开浏览器...
    start "" "http://localhost:5173"
)

echo.
echo ============================================
echo   访问地址: http://localhost:5173
echo   停止: 关闭 novel-backend / novel-frontend 两个窗口
echo ============================================
echo.
endlocal
