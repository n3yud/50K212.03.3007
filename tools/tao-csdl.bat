@echo off
chcp 65001 >nul
rem ==== Bat SQL Server (neu dang tat), tao lai CSDL NgoiNhaNho, cap nhat appsettings.json ====
rem Can quyen Administrator de bat dich vu SQL Server -> tu xin quyen.
net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
cd /d "%~dp0.."
set LOG=%~dp0ket-qua-csdl.txt
echo ==== TAO CSDL %date% %time% ==== > "%LOG%"
set SRV=
rem 1) Tim instance dang chay
for %%S in (MSSQLSERVER SQLEXPRESS MSSQLSERVER01 MSSQLSERVER02 MSSQLSERVER03 MSSQLSERVER04 MSSQLSERVER05 MSSQLSERVER06 MSSQLSERVER07) do call :check %%S
rem 2) Khong co instance nao chay -> thu bat MSSQLSERVER roi SQLEXPRESS
if "%SRV%"=="" call :start MSSQLSERVER
if "%SRV%"=="" call :start SQLEXPRESS
echo SERVER_CHON=%SRV% >> "%LOG%"
if "%SRV%"=="" (echo KHONG BAT DUOC SQL SERVER NAO >> "%LOG%" & goto :end)
echo [01_schema.sql] >> "%LOG%"
sqlcmd -S %SRV% -E -C -I -b -f 65001 -i database\01_schema.sql >> "%LOG%" 2>&1
echo SCHEMA_EXIT=%errorlevel% >> "%LOG%"
echo [02_seed.sql] >> "%LOG%"
sqlcmd -S %SRV% -E -C -I -b -f 65001 -i database\02_seed.sql >> "%LOG%" 2>&1
echo SEED_EXIT=%errorlevel% >> "%LOG%"
echo [kiem tra du lieu] >> "%LOG%"
sqlcmd -S %SRV% -E -C -I -f 65001 -d NgoiNhaNho -Q "SET NOCOUNT ON; SELECT COUNT(*) AS SoHocVien, MIN(Code) AS MaDau, MAX(Code) AS MaCuoi FROM Students; SELECT Role, COUNT(*) AS SoTaiKhoan FROM Users GROUP BY Role;" >> "%LOG%" 2>&1
rem 3) Ghi ten server vao appsettings.json cua Backend
powershell -NoProfile -Command "$p='backend\NgoiNhaNho.Api\appsettings.json'; $t=Get-Content $p -Raw -Encoding UTF8; $t=$t -replace 'Server=[^;]*;', ('Server=' + '%SRV%'.Replace('\','\\') + ';'); [IO.File]::WriteAllText((Resolve-Path $p), $t)" >> "%LOG%" 2>&1
findstr /i "Server=" backend\NgoiNhaNho.Api\appsettings.json >> "%LOG%"
goto :end
:check
set SVC=%1
if not "%1"=="MSSQLSERVER" set SVC=MSSQL$%1
sc query "%SVC%" | findstr /i "RUNNING" >nul
if errorlevel 1 (echo %1 : STOPPED >> "%LOG%") else (echo %1 : RUNNING >> "%LOG%" & if "%SRV%"=="" (if "%1"=="MSSQLSERVER" (set SRV=localhost) else (set SRV=localhost\%1)))
goto :eof
:start
set SVC=%1
if not "%1"=="MSSQLSERVER" set SVC=MSSQL$%1
echo [bat dich vu %SVC%] >> "%LOG%"
sc config "%SVC%" start= demand >> "%LOG%" 2>&1
net start "%SVC%" >> "%LOG%" 2>&1
call :check %1
goto :eof
:end
echo ==== XONG ==== >> "%LOG%"
start "" notepad "%LOG%"
