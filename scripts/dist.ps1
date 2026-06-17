$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/.."
$distDir = "$root/dist"
$iconDir = "$distDir/icon"

Write-Host "=== 1. Build SvelteKit app ===" -ForegroundColor Cyan
Set-Location $root
npm run build

Write-Host "=== 2. Generate icon PNGs from SVG ===" -ForegroundColor Cyan
if (-not (Test-Path "$iconDir/icon-16.png")) {
    New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
    inkscape --export-filename="$iconDir/icon-16.png" -w 16 -h 16 "$root/static/favicon.svg"
    inkscape --export-filename="$iconDir/icon-32.png" -w 32 -h 32 "$root/static/favicon.svg"
    inkscape --export-filename="$iconDir/icon-48.png" -w 48 -h 48 "$root/static/favicon.svg"
    inkscape --export-filename="$iconDir/icon-256.png" -w 256 -h 256 "$root/static/favicon.svg"
}

Write-Host "=== 3. Build .ico file ===" -ForegroundColor Cyan
python "$root/scripts/make-ico.py"

Write-Host "=== 4. Bundle server with esbuild ===" -ForegroundColor Cyan
npx esbuild build/index.js --bundle --platform=node --format=esm --outfile=$distDir/bundle.mjs --external:stream --external:fs --external:path --external:os --external:crypto --external:child_process --external:module --external:url --external:util --external:assert --external:events --external:tty --banner:js="import { createRequire } from 'module'; var require = createRequire(import.meta.url);"

Write-Host "=== 5. Copy client assets ===" -ForegroundColor Cyan
if (Test-Path "$root/build/client") {
    Remove-Item -Recurse -Force "$distDir/client" -ErrorAction SilentlyContinue
    Copy-Item -Recurse "$root/build/client" "$distDir/client"
}

Write-Host "=== 6. Copy icon to dist root ===" -ForegroundColor Cyan
Copy-Item "$iconDir/hugo-cms.ico" "$distDir/hugo-cms.ico" -Force

Write-Host "=== 6b. Copy .env.example ===" -ForegroundColor Cyan
Copy-Item "$root/.env.example" "$distDir/.env.example" -Force

Write-Host "=== 7. Compile C# tray launcher ===" -ForegroundColor Cyan
$csc = "$env:windir\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /target:winexe /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /win32icon:$iconDir/hugo-cms.ico /out:$distDir/hugo-cms.exe $root/scripts/tray-launcher.cs 2>&1 | Out-Null

Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Distribution folder: $distDir" -ForegroundColor Green
Get-ChildItem $distDir -Name | ForEach-Object { "  $_" }

$size = [math]::Round(((Get-Item "$distDir/bundle.mjs").Length + (Get-Item "$distDir/hugo-cms.exe").Length + (Get-Item "$distDir/hugo-cms.ico").Length + (Get-ChildItem -Recurse "$distDir/client" | Measure-Object -Property Length -Sum).Sum) / 1MB, 1)
Write-Host "Total size: ~${size} MB (plus Node.js runtime)" -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: Requires Node.js installed (or copy node.exe to $distDir)" -ForegroundColor Yellow
