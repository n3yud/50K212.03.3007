@echo off
chcp 65001 >nul
rem ==== Chay giao dien voi du lieu gia lap (khong can Backend, SQL Server) ====
cd /d "%~dp0..\frontend"
if exist .env del .env
if not exist node_modules call npm install
start "" "http://localhost:5173/login"
call npm run dev
pause
