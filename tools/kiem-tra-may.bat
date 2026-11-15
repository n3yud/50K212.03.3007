@echo off
chcp 65001 >nul
rem Kiem tra moi truong + bien dich backend. Ket qua ghi vao tools\ket-qua-kiem-tra.txt
cd /d "%~dp0.."
set LOG=%~dp0ket-qua-kiem-tra.txt
echo ==== KIEM TRA %date% %time% ==== > "%LOG%"
echo [dotnet] >> "%LOG%"
where dotnet >> "%LOG%" 2>&1
dotnet --list-sdks >> "%LOG%" 2>&1
echo [node] >> "%LOG%"
node -v >> "%LOG%" 2>&1
echo [sqlcmd] >> "%LOG%"
where sqlcmd >> "%LOG%" 2>&1
echo [sql services] >> "%LOG%"
sc query state= all | findstr /i "SERVICE_NAME.*SQL" >> "%LOG%" 2>&1
echo [localdb] >> "%LOG%"
sqllocaldb info >> "%LOG%" 2>&1
echo [connection string] >> "%LOG%"
findstr /i "Default" backend\NgoiNhaNho.Api\appsettings.json >> "%LOG%" 2>&1
echo ==== DOTNET BUILD ==== >> "%LOG%"
cd backend\NgoiNhaNho.Api
dotnet build -nologo -v q >> "%LOG%" 2>&1
echo BUILD_EXIT=%errorlevel% >> "%LOG%"
echo ==== XONG ==== >> "%LOG%"
