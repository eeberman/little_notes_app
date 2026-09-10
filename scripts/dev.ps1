param([ValidateSet('install','start','typecheck','test','package','make','seed','smoke')][string]$Action='start')
$ErrorActionPreference='Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$runtimeRoot = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node'
$bundledNode = Join-Path $runtimeRoot 'bin/node.exe'
$bundledPnpm = Join-Path $runtimeRoot 'node_modules/pnpm/bin/pnpm.cjs'
if ((Test-Path -LiteralPath $bundledNode) -and (Test-Path -LiteralPath $bundledPnpm)) {
  $env:PATH = (Split-Path $bundledNode -Parent) + ';' + $env:PATH
  if ($Action -eq 'install') { & $bundledNode $bundledPnpm install --frozen-lockfile }
  else { & $bundledNode $bundledPnpm run $Action }
} else {
  if ($Action -eq 'install') { & pnpm install --frozen-lockfile }
  else { & pnpm run $Action }
}
exit $LASTEXITCODE
