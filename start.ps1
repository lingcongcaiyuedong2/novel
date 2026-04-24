# 一键启动（PowerShell）—— 在项目根目录运行:  ./start.ps1
# 会在两个新 PowerShell 窗口中分别启动后端与前端，关闭窗口即停止

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  启动 修仙小说生成器" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# ----- 前置检查 -----
if (-not (Test-Path "backend\venv\Scripts\Activate.ps1")) {
    Write-Host "[错误] 未找到 backend\venv，请先创建虚拟环境并安装依赖:" -ForegroundColor Red
    Write-Host "  cd backend; python -m venv venv; ./venv/Scripts/Activate.ps1; pip install -r requirements.txt"
    exit 1
}
if (-not (Test-Path "backend\.env")) {
    Write-Host "[错误] 未找到 backend\.env，请:  copy backend\.env.example backend\.env  并填入 API Key" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[错误] 未找到 frontend\node_modules，请先:  cd frontend; npm install" -ForegroundColor Red
    exit 1
}

# ----- 启动后端 -----
Write-Host "[1/2] 启动后端 http://localhost:8000" -ForegroundColor Green
$backendCmd = "Set-Location '$root\backend'; & '$root\backend\venv\Scripts\Activate.ps1'; uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 3

# ----- 启动前端 -----
Write-Host "[2/2] 启动前端 http://localhost:5173" -ForegroundColor Green
$frontendCmd = "Set-Location '$root\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

# ----- 等待前端就绪并打开浏览器 -----
Write-Host "`n等待前端就绪..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 1 | Out-Null
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if ($ready) {
    Write-Host "前端已就绪，打开浏览器..." -ForegroundColor Green
    Start-Process "http://localhost:5173"
} else {
    Write-Host "[警告] 前端 30 秒内未就绪，请检查前端窗口日志" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  访问地址: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  停止: 关闭对应的两个 PowerShell 窗口" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
