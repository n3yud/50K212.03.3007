@echo off
chcp 65001 >nul
echo ==== KIEM THU TU DONG (UNIT TEST) ====
echo.
echo [1/2] Dang chay Unit Test Backend (xUnit .NET)...
cd /d "%~dp0..\backend"
call dotnet test --logger "console;verbosity=normal"
echo.
echo [2/2] Dang chay Kiem thu Frontend (Node.js)...
cd /d "%~dp0..\frontend"
call npm test
echo.
echo ==== HOAN THANH KIEM THU ====
pause
