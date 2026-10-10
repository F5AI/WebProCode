@echo off
rem F5 AI Studio - DEMO cuc bo ban production build (API + web cung cong 3080), du lieu rieng trong .data-demo.
rem Tai khoan quan tri demo nam trong .env.demo (tu tao lan dau). Dong cua so nay de tat demo.
cd /d "%~dp0"
if not exist node_modules (
  echo Dang cai dependencies lan dau...
  call npm.cmd ci || exit /b 1
)
start "" http://localhost:3080
node scripts/demo-local.mjs
