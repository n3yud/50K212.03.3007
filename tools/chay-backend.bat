@echo off
chcp 65001 >nul
rem ==== Bien dich + chay Backend (http://localhost:5000). Ket qua bien dich ghi vao tools\ket-qua-build.txt ====
if not exist "C:\Program Files\dotnet\host\fxr" (
  echo.
  echo  May chua cai .NET 8 SDK ^(hoac ban cai bi hong^).
  echo  Trang tai se tu mo: chon .NET 8.0 - cot SDK - Windows x64 - Installer, cai xong chay lai file nay.
  start "" "https://dotnet.microsoft.com/en-us/download/dotnet/8.0"
  pause
  exit /b
)
cd /d "%~dp0..\backend\NgoiNhaNho.Api"
set LOG=%~dp0ket-qua-build.txt
echo ==== BUILD %date% %time% ==== > "%LOG%"
dotnet --list-sdks >> "%LOG%" 2>&1
dotnet build -nologo >> "%LOG%" 2>&1
echo BUILD_EXIT=%errorlevel% >> "%LOG%"
findstr /c:"BUILD_EXIT=0" "%LOG%" >nul || (echo Bien dich LOI - xem tools\ket-qua-build.txt & start "" notepad "%LOG%" & pause & exit /b)
set ASPNETCORE_ENVIRONMENT=Development
echo.
echo  Backend dang chay tai http://localhost:5000  - GIU NGUYEN cua so nay, dong lai la tat Backend.
dotnet run --no-build --urls http://localhost:5000
pause
