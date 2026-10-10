@echo off
rem F5 AI Studio - khoi dong website o che do dev (API 3001 + web 5173) va mo trinh duyet.
rem Dung npm.cmd de tranh loi execution policy cua PowerShell. Dong cua so nay de tat server.
cd /d "%~dp0"
if not exist node_modules (
  echo Dang cai dependencies lan dau...
  call npm.cmd ci || exit /b 1
)
if not exist .env copy .env.example .env >nul
start "" http://localhost:5173
call npm.cmd run dev
