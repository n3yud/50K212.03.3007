@echo off
chcp 65001 >nul
rem ==== Chay giao dien. Tham so "that" = noi Backend that; bo trong = du lieu gia lap ====
cd /d "%~dp0..\frontend"
if /i "%1"=="that" (echo VITE_API_BASE_URL=http://localhost:5000/api> .env) else (if exist .env del .env)
if not exist node_modules call npm install
call npm run dev
