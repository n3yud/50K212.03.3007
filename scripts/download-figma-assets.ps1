$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$items = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'figma-assets.json') -Raw | ConvertFrom-Json
foreach ($item in $items) {
    $destination = Join-Path $projectRoot ('frontend/public/assets/' + $item.group)
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    $target = Join-Path $destination $item.file
    if (!(Test-Path -LiteralPath $target)) {
        & curl.exe --fail --location --silent --show-error $item.url --output $target
        if ($LASTEXITCODE -ne 0) { throw 'Could not download Figma asset.' }
    }
}
Write-Output ('Downloaded ' + $items.Count + ' assets.')
