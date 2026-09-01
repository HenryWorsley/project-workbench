@echo off
chcp 65001 >nul
title 项目工作台
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo 未找到 npm，请先安装 Node.js 22.13 或更高版本。
  pause
  exit /b 1
)

set "WORKBENCH_URL=http://localhost:3001"

rem 等待开发服务器真正响应后再打开浏览器，避免首次编译期间出现“无法访问”。
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "$url='%WORKBENCH_URL%'; for($i=0; $i -lt 120; $i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if($r.StatusCode -eq 200){ Start-Process $url; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 }; exit 1"

echo.
echo   项目工作台正在启动...
echo   页面准备好后，浏览器将自动打开 %WORKBENCH_URL%
echo   关闭此窗口即可停止应用。
echo.
call npm run dev -- --host 127.0.0.1 --port 3001

if errorlevel 1 (
  echo.
  echo   启动失败。请确认 3001 端口没有被其他程序占用。
  pause
)
