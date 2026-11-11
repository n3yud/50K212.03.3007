$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot 'backend'
$assemblyPath = Join-Path $backendPath 'bin/Release/net8.0/NgoiNhaNho.Api.dll'
if (!(Test-Path -LiteralPath $assemblyPath)) { throw 'Build the backend in Release mode first. See README.md.' }
if (!(Test-Path -LiteralPath (Join-Path $backendPath 'wwwroot/index.html'))) { throw 'Build the frontend first: npm run build in frontend.' }
Push-Location -LiteralPath $backendPath
try { & dotnet $assemblyPath --urls 'http://127.0.0.1:5080' }
finally { Pop-Location }
