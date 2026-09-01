$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$zip = Join-Path $root "lambda-deploy.zip"
$staging = Join-Path $root ".lambda-package"

if (Test-Path -LiteralPath $zip) {
  Remove-Item -LiteralPath $zip -Force
}
if (Test-Path -LiteralPath $staging) {
  Remove-Item -LiteralPath $staging -Recurse -Force
}

New-Item -ItemType Directory -Path $staging | Out-Null

$items = @("src", "node_modules", "package.json", "package-lock.json", "index.js")
foreach ($item in $items) {
  $source = Join-Path $root $item
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination $staging -Recurse
  }
}

Push-Location $staging
try {
  tar -a -cf $zip .
} finally {
  Pop-Location
}
Remove-Item -LiteralPath $staging -Recurse -Force

Write-Host "Pacote Lambda criado: $zip"
