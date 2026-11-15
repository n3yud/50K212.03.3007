@echo off
chcp 65001 >nul
rem ==== Chay giao dien noi voi Backend that (Backend phai dang chay o cua so khac) ====
cd /d "%~dp0..\frontend"
echo VITE_API_BASE_URL=http://localhost:5000/api> .env
if not exist node_modules call npm install
start "" "http://localhost:5173/login"
call npm run dev
pause
