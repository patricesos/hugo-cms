$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/.."
$version = "v0.1.0"
$distDir = "$root/dist/hugo-cms-$version"

Write-Host "=== Build ===" -ForegroundColor Cyan
Set-Location $root
npm run build

Write-Host "=== Creating dist folder ===" -ForegroundColor Cyan
if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

Write-Host "=== Copying files ===" -ForegroundColor Cyan
Copy-Item -Recurse "$root/build" "$distDir/build" -Force
Copy-Item "$root/package.json" "$distDir/" -Force
if (Test-Path "$root/package-lock.json") {
    Copy-Item "$root/package-lock.json" "$distDir/" -Force
}
Copy-Item "$root/.env.example" "$distDir/" -Force
Copy-Item "$root/start.bat" "$distDir/" -Force
Copy-Item "$root/start.sh" "$distDir/" -Force

Write-Host "=== Installing production dependencies ===" -ForegroundColor Cyan
Set-Location $distDir
npm install --production --ignore-scripts 2>&1 | Out-Null

Set-Location $root

Write-Host "=== Creating ZIP archive ===" -ForegroundColor Cyan
$zipPath = "$root/dist/hugo-cms-$version.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
7z a -tzip $zipPath "$distDir\*" -mmt -mx=5 2>&1 | Out-Null

$size = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Host "Done: $zipPath (${size} MB)" -ForegroundColor Green

Write-Host "dist contents:" -ForegroundColor Green
Get-ChildItem "$distDir" -Name
