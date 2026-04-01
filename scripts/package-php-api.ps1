param(
    [string]$OutputRoot = "deployment/out"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$outputRootPath = Join-Path $repoRoot $OutputRoot
$packageRoot = Join-Path $outputRootPath "php-api"
$zipPath = Join-Path $outputRootPath "dvcreg-php-api.zip"

if (Test-Path $packageRoot) {
    Remove-Item -LiteralPath $packageRoot -Recurse -Force
}

if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $repoRoot "api") -Destination $packageRoot -Recurse
Copy-Item -LiteralPath (Join-Path $repoRoot "vendor") -Destination $packageRoot -Recurse
Copy-Item -LiteralPath (Join-Path $repoRoot "composer.json") -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $repoRoot "composer.lock") -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $repoRoot "deployment\php-api\.env.local.example") -Destination (Join-Path $packageRoot ".env.local.example")
Copy-Item -LiteralPath (Join-Path $repoRoot "deployment\php-api\README.md") -Destination (Join-Path $packageRoot "README.md")

Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $zipPath -Force

Write-Output "Package directory: $packageRoot"
Write-Output "Zip file: $zipPath"
